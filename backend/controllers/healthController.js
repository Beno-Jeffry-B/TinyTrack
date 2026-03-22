const { pool } = require('../config/db');

// GET /api/health
const healthCheck = async (req, res) => {
  try {
    await pool.query('SELECT 1'); // lightweight DB ping
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
};

module.exports = { healthCheck };
