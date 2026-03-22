const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

// ── helpers ─────────────────────────────────────────────
const issueToken = (user) =>
  jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

// ── POST /api/auth/signup ────────────────────────────────
const signup = async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  // --- Input validation ---
  if (!email || !password || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  try {
    // --- Check uniqueness ---
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // --- Hash & insert ---
    const password_hash = await bcrypt.hash(password, ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email.toLowerCase(), password_hash]
    );

    const user = result.rows[0];
    const token = issueToken(user);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: { id: user.id, email: user.email },
      },
    });
  } catch (err) {
    console.error('[signup]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /api/auth/login ─────────────────────────────────
const login = async (req, res) => {
  console.log('[login] req.body:', req.body); // debug

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found. Please sign up.' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({ success: false, message: 'This account uses Google sign-in' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please try again.' });
    }

    const token = issueToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: { id: user.id, email: user.email },
      },
    });
  } catch (err) {
    console.error('[login]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/auth/me ─────────────────────────────────────
const getCurrentUser = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await pool.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [decoded.userId || decoded.id] // Support legacy or new token shapes
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];
    return res.json({
      success: true,
      data: { user: { id: user.id, email: user.email } }
    });
  } catch (err) {
    console.error('[getCurrentUser]', err.message);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

module.exports = { signup, login, getCurrentUser };
