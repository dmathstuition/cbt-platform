const { Pool } = require('pg');

const pool = new Pool({

  connectionString: 'postgresql://cbt_database_zuub_user:V1l4Zgbqtc5gB0ycw9WtjEUsSV2xFzef@dpg-d6heboua2pns738gd0u0-a.frankfurt-postgres.render.com/cbt_database_zuub',

  ssl: { rejectUnauthorized: false }

});

async function check() {

  try {

    const res = await pool.query('SELECT id, email, role, school_id FROM users');

    console.log('Users found:', res.rows);

    const schools = await pool.query('SELECT id, name FROM schools');

    console.log('Schools found:', schools.rows);

    process.exit();

  } catch (err) {

    console.error('Error:', err.message);

    process.exit();

  }

}

check();