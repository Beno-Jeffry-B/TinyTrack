const { Pool } = require('pg');

// Local PostgreSQL — no SSL needed
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

/**
 * Verifies the database connection is alive.
 * Called once on server startup.
 */
const connectDB = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log(`✅ PostgreSQL connected — server time: ${result.rows[0].now}`);
  } catch (err) {
    console.error('❌ Database connection failed:');
    console.error('  message:', err.message || '(no message)');
    console.error('  code   :', err.code);
    console.error('  full   :', err);
    process.exit(1);
  }
};

module.exports = { pool, connectDB };
