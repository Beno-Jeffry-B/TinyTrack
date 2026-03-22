const { pool } = require('../config/db');

// ── Helper: classify device from user agent string ───────────────────
const classifyDevice = (ua = '') => {
  const s = ua.toLowerCase();
  if (s.includes('mobile')) return 'Mobile';
  return 'Desktop';
};

// ── Helper: resolve country code → display name ───────────────────────
const resolveCountryName = (code) => {
  if (!code || code === 'Unknown') return 'Unknown';
  if (code.length > 2) return code; // already a display name (legacy data)
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
};

// ── Time range config ─────────────────────────────────────────────────
// Maps ?range= param → SQL interval + grouping unit
const RANGE_CONFIG = {
  '1d': { interval: "INTERVAL '1 day'",   trunc: 'hour',  label: '1d' },
  '7d': { interval: "INTERVAL '7 days'",  trunc: 'day',   label: '7d' },
  '1m': { interval: "INTERVAL '30 days'", trunc: 'day',   label: '1m' },
  '1y': { interval: "INTERVAL '1 year'",  trunc: 'week',  label: '1y' },
};
const DEFAULT_RANGE = '7d';

// ── GET /api/url/:id/analytics ───────────────────────────────────────
// Protected — must belong to the requesting user
const getAnalytics = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const rangeKey = RANGE_CONFIG[req.query.range] ? req.query.range : DEFAULT_RANGE;
  const { interval, trunc } = RANGE_CONFIG[rangeKey];
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];

  console.log(`[analytics] fetching for url_id=${id} user_id=${userId} range=${rangeKey} date=${targetDate}`);

  try {
    // ── 1. Ownership check + base stats ─────────────────────────────
    const urlResult = await pool.query(
      `SELECT id, clicks, created_at, user_id FROM urls
       WHERE id = $1 AND is_deleted = false`,
      [id]
    );

    if (urlResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'URL not found' });
    }

    const url = urlResult.rows[0];

    if (String(url.user_id) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const totalClicks = url.clicks;
    console.log(`[analytics] total clicks = ${totalClicks}`);

    const trendPromise = rangeKey === '1d' 
      ? pool.query(
          `SELECT 
             DATE_TRUNC('minute', timestamp) as date,
             COUNT(*) as clicks
           FROM clicks
           WHERE url_id = $1
           AND DATE(timestamp) = $2
           GROUP BY date
           ORDER BY date ASC`,
          [id, targetDate]
        )
      : pool.query(
          `SELECT
             DATE_TRUNC('${trunc}', d.slot)::date AS date,
             COALESCE(SUM(c.cnt), 0)::int AS clicks
           FROM generate_series(
             NOW() - ${interval},
             NOW(),
             '1 ${trunc === 'week' ? 'week' : trunc === 'hour' ? 'hour' : 'day'}'::interval
           ) AS d(slot)
           LEFT JOIN (
             SELECT DATE_TRUNC('${trunc}', timestamp) AS bucket, COUNT(*) AS cnt
             FROM clicks
             WHERE url_id = $1
               AND timestamp >= NOW() - ${interval}
             GROUP BY bucket
           ) c ON DATE_TRUNC('${trunc}', d.slot) = c.bucket
           GROUP BY DATE_TRUNC('${trunc}', d.slot)
           ORDER BY date ASC`,
          [id]
        );

    // ── 2. Run all queries in parallel ──────────────────────────────
    const [trendResult, agentResult, locationResult, lastVisitResult, previousPeriodResult, uniqueVisitorsResult, recentHistoryResult] = await Promise.all([
      trendPromise,

      // All user_agents — for device classification in Node.js
      pool.query(
        `SELECT user_agent FROM clicks WHERE url_id = $1`,
        [id]
      ),

      // Location breakdown
      pool.query(
        `SELECT COALESCE(country, 'Unknown') AS country, COUNT(*) AS count
         FROM clicks
         WHERE url_id = $1
         GROUP BY COALESCE(country, 'Unknown')
         ORDER BY count DESC`,
        [id]
      ),

      // Last click timestamp
      pool.query(
        `SELECT MAX(timestamp) AS last_visited FROM clicks WHERE url_id = $1`,
        [id]
      ),

      // Previous period total clicks (for trend percentage)
      pool.query(
        `SELECT COUNT(*) AS count
         FROM clicks
         WHERE url_id = $1
           AND timestamp >= NOW() - (${interval}::interval * 2)
           AND timestamp < NOW() - ${interval}`,
        [id]
      ),

      // Unique visitors (all time count)
      pool.query(
        `SELECT COUNT(DISTINCT ip || user_agent) AS unique_visitors
         FROM clicks
         WHERE url_id = $1`,
        [id]
      ),

      // Recent visitors (last 10)
      pool.query(
        `SELECT timestamp as date, user_agent, country as location 
         FROM clicks 
         WHERE url_id = $1 
         ORDER BY timestamp DESC LIMIT 10`,
        [id]
      ),
    ]);

    // ── 3. Daily trend (zero-filled) ──────────────────────────────────
    const daily_trend = trendResult.rows.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString() : r.date,
      clicks: Number(r.clicks),
    }));
    console.log(`[analytics] trend data points = ${daily_trend.length} (range=${rangeKey})`);

    // ── 4. Device breakdown ───────────────────────────────────────────
    const deviceCounts = {};
    agentResult.rows.forEach(({ user_agent }) => {
      const type = classifyDevice(user_agent);
      deviceCounts[type] = (deviceCounts[type] ?? 0) + 1;
    });
    const device_breakdown = Object.entries(deviceCounts)
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);
    console.log(`[analytics] device breakdown = ${JSON.stringify(device_breakdown)}`);

    // ── 5. Location breakdown ─────────────────────────────────────────
    console.log(`[analytics] raw location rows:`, JSON.stringify(locationResult.rows));
    
    // Normalize and manually group to guarantee NO duplicates down the line
    const locationMap = new Map();
    locationResult.rows.forEach((r) => {
      const normalizedCode = r.country || 'Unknown';
      const resolved = resolveCountryName(normalizedCode);
      const prevCount = locationMap.get(resolved) || 0;
      locationMap.set(resolved, prevCount + parseInt(r.count, 10));
    });
    
    console.log(`[analytics] normalized locations:`, JSON.stringify(Array.from(locationMap.keys())));

    const location_breakdown = Array.from(locationMap.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
      
    console.log(`[analytics] final grouped locations:`, JSON.stringify(location_breakdown));

    // ── 7. Recent visitor history ─────────────────────────────────────
    const recent_history = recentHistoryResult.rows.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString() : r.date,
      device: classifyDevice(r.user_agent),
      location: resolveCountryName(r.location || 'Unknown'),
    }));

    // ── 6. Last visited, Previous period & Unique Visitors ───────────
    const last_visited = lastVisitResult.rows[0]?.last_visited ?? null;
    const previous_period_clicks = parseInt(previousPeriodResult.rows[0]?.count ?? 0, 10);
    
    console.log('[analytics] unique visitors query result:', uniqueVisitorsResult.rows[0]);
    const unique_visitors = parseInt(uniqueVisitorsResult.rows[0]?.unique_visitors ?? 0, 10);
    console.log(`[analytics] last_visited = ${last_visited}, prev_clicks = ${previous_period_clicks}, unique_visitors = ${unique_visitors}`);

    console.log(`[analytics] data fetched successfully for url_id=${id}`);

    return res.json({
      success: true,
      message: 'Analytics fetched successfully',
      data: {
        total_clicks: totalClicks,
        unique_visitors,
        previous_period_clicks,
        last_visited,
        created_at: url.created_at,
        daily_trend,
        device_breakdown,
        location_breakdown,
        recent_history,
      },
    });

  } catch (err) {
    console.error('[analytics] error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAnalytics };
