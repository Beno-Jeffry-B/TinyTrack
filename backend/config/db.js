const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { require: true, rejectUnauthorized: false }
    : false,
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
    console.error('DB ERROR:', err);
    process.exit(1);
  }
};

module.exports = { pool, connectDB };
