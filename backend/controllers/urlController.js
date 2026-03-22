const { pool } = require('../config/db');
const { generateShortCode } = require('../utils/base62');
const geoip = require('geoip-lite');

const BASE_URL = process.env.SERVER_URL || 'http://localhost:5000';

// ── POST /api/url ────────────────────────────────────────
// Protected — requires JWT via authMiddleware
const createUrl = async (req, res) => {
  // ── Debug: log everything coming in ──────────────────
  console.log('[createUrl] --- incoming request ---');
  console.log('[createUrl] Authorization header:', req.headers.authorization || 'MISSING');
  console.log('[createUrl] req.user:', req.user);
  console.log('[createUrl] req.body:', req.body);

  // Guard: JWT middleware should have set req.user
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized — no user in token' });
  }

  const userId = req.user.userId;

  // Accept both snake_case (original_url) and camelCase (destinationUrl) from frontend
  const original_url  = req.body.original_url  || req.body.destinationUrl;
  const custom_alias  = req.body.custom_alias  || req.body.customAlias  || req.body.alias;
  const expiry_date   = req.body.expiry_date   || req.body.expiryDate;

  console.log('[createUrl] parsed →', { original_url, custom_alias, expiry_date, userId });

  // --- Validation ---
  if (!original_url || !original_url.trim()) {
    return res.status(400).json({ success: false, message: 'Invalid URL' });
  }
  try { new URL(original_url); } catch {
    return res.status(400).json({ success: false, message: 'Invalid URL' });
  }

  try {
    let short_code;

    if (custom_alias && custom_alias.trim()) {
      // Sanitise: lowercase, alphanumeric + hyphens only
      const alias = custom_alias.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (!alias) {
        return res.status(400).json({ success: false, message: 'Custom alias contains invalid characters' });
      }

      // Uniqueness check
      const existing = await pool.query(
        'SELECT id FROM urls WHERE short_code = $1 AND is_deleted = false',
        [alias]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: "Custom short URL already taken" });
      }
      short_code = alias;
    } else {
      // Auto-generate unique short code (retry up to 5 times on collision)
      let attempts = 0;
      while (attempts < 5) {
        const candidate = generateShortCode(7);
        const exists = await pool.query(
          'SELECT id FROM urls WHERE short_code = $1',
          [candidate]
        );
        if (exists.rows.length === 0) {
          short_code = candidate;
          break;
        }
        attempts++;
      }
      if (!short_code) {
        return res.status(500).json({ success: false, message: 'Could not generate a unique short code. Try again.' });
      }
    }

    console.log('[createUrl] inserting →', { userId, original_url, short_code, expiry_date });

    // --- Insert ---
    const result = await pool.query(
      `INSERT INTO urls (user_id, original_url, short_code, expires_at, clicks, is_deleted)
       VALUES ($1, $2, $3, $4, 0, false)
       RETURNING id, user_id, original_url, short_code, expires_at, clicks, created_at`,
      [userId, original_url.trim(), short_code, expiry_date || null]
    );

    const url = result.rows[0];
    const response = {
      id:           url.id,
      user_id:      url.user_id,
      original_url: url.original_url,
      short_code:   url.short_code,
      short_url:    `${BASE_URL}/${url.short_code}`,
      expires_at:   url.expires_at,
      clicks:       url.clicks,
      created_at:   url.created_at,
    };

    console.log('[createUrl] success →', response);
    return res.status(201).json({ success: true, message: 'Short URL created successfully', data: response });

  } catch (err) {
    console.error('DB ERROR:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
};

// ── Helpers: IP extraction + geolocation ─────────────────────────────
/**
 * Extract the real client IP from the request.
 * Returns null for loopback / unresolvable addresses.
 */
const extractIp = (req) => {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown";

  if (ip === "::1" || ip === "127.0.0.1") {
    ip = "local-" + req.headers["user-agent"];
  }

  // Strip IPv6-mapped IPv4 prefix (::ffff:1.2.3.4 → 1.2.3.4)
  return ip.replace(/^::ffff:/, '');
};


// ── GET /:shortCode ──────────────────────────────────────
// Public — redirect to original URL + track click
const redirectUrl = async (req, res) => {
  const { shortCode } = req.params;
  console.log('[redirectUrl] shortCode:', shortCode);

  try {
    const result = await pool.query(
      `SELECT * FROM urls WHERE short_code = $1 AND is_deleted = false`,
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Short URL not found' });
    }

    const url = result.rows[0];

    // Expiry check
    if (url.expires_at && new Date(url.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This link has expired' });
    }

    // Extract IP early so we can log it before redirect
    const ip = extractIp(req);
    const userAgent = req.headers['user-agent'] || null;
    console.log(`[redirect] ip: ${ip}`);
    console.log(`[redirect] userAgent: ${userAgent}`);

    // ── REDIRECT IMMEDIATELY — do NOT wait for geolocation ──────────
    console.log('[redirectUrl] redirecting to:', url.original_url);
    
    // Prevent browser caching of the redirect so every hit counts
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Surrogate-Control": "no-store"
    });
    res.redirect(301, url.original_url);

    // ── Non-blocking: update DB after redirect is sent ───────────────
    (async () => {
      try {
        let country = "Unknown";
        if (ip === "::1" || ip === "127.0.0.1" || ip.startsWith("local-")) {
          country = "Localhost";
        } else {
          const geo = geoip.lookup(ip);
          country = geo?.country || "Unknown";
        }
        console.log(`[redirect] country detected: ${country} for ip=${ip ?? 'unknown'}`);

        await Promise.all([
          pool.query(
            'UPDATE urls SET clicks = clicks + 1 WHERE id = $1',
            [url.id]
          ),
          pool.query(
            'INSERT INTO clicks (url_id, ip, user_agent, country) VALUES ($1, $2, $3, $4)',
            [url.id, ip, userAgent, country]
          ),
        ]);
        
        console.log(`[redirect] click inserted`);
        
        const io = req.app.get('io');
        if (io) {
          io.to(`url_${url.id}`).emit('click_update', {
            urlId: String(url.id),
            timestamp: new Date()
          });
          console.log(`[socket] Emitted click_update for url_${url.id}`);
        }
      } catch (trackErr) {
        console.error('[redirect] click tracking error:', trackErr.message);
      }
    })();

  } catch (err) {
    console.error('DB ERROR:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/url ─────────────────────────────────────────
// Protected — list all URLs for authenticated user
const listUrls = async (req, res) => {
  const userId = req.user.userId;
  console.log('[listUrls] userId:', userId);

  try {
    const result = await pool.query(
      `SELECT id, user_id, original_url, short_code, clicks, expires_at, is_deleted, created_at
       FROM urls
       WHERE user_id = $1 AND is_deleted = false
       ORDER BY created_at DESC`,
      [userId]
    );
    return res.json(result.rows.map(url => ({
      ...url,
      short_url: `${BASE_URL}/${url.short_code}`,
    })));
  } catch (err) {
    console.error('DB ERROR:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /api/url/:id ──────────────────────────────────
// Protected — soft-delete a URL owned by this user
const deleteUrl = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  console.log('[deleteUrl] id:', id, 'userId:', userId);

  try {
    const result = await pool.query(
      `UPDATE urls SET is_deleted = true
       WHERE id = $1 AND user_id = $2 AND is_deleted = false
       RETURNING id`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'URL not found or already deleted' });
    }
    return res.json({ success: true, message: 'URL deleted successfully' });
  } catch (err) {
    console.error('[deleteUrl] error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createUrl, redirectUrl, listUrls, deleteUrl };
