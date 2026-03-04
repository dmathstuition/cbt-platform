const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query('SELECT id, email, role FROM users');
    console.log('Users in Render DB:', res.rows);
    process.exit();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit();
  }
}

check();
 