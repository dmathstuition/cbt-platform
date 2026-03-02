const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Use EXACT same URL as in Render environment variables
const pool = new Pool({
  connectionString: 'postgresql://cbt_database_zuub_user:V1l4Zgbqtc5gB0ycw9WtjEUsSV2xFzef@dpg-d6heboua2pns738gd0u0-a.frankfurt-postgres.render.com/cbt_database_zuub',
  ssl: { rejectUnauthorized: false }
});

async function reset() {
  try {
    // Check what's in this database
    const users = await pool.query('SELECT id, email, role FROM users');
    console.log('Current users:', users.rows);
    
    const schools = await pool.query('SELECT id, name FROM schools');
    console.log('Current schools:', schools.rows);

    if (users.rows.length === 0) {
      console.log('No users found - creating admin...');
      const schoolId = uuidv4();
      const adminId = uuidv4();
      const hash = await bcrypt.hash('password123', 10);

      await pool.query(
        'INSERT INTO schools (id, name) VALUES ($1, $2)',
        [schoolId, 'My School']
      );
      await pool.query(
        `INSERT INTO users (id, school_id, first_name, last_name, email, password, role, approval_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [adminId, schoolId, 'Admin', 'User', 'admin@school.com', hash, 'school_admin', 'approved']
      );
      console.log('✅ Admin created!');
    } else {
      // Reset existing admin password
      const hash = await bcrypt.hash('password123', 10);
      await pool.query(
        'UPDATE users SET password=$1 WHERE email=$2',
        [hash, 'admin@school.com']
      );
      console.log('✅ Password reset!');
    }
    process.exit();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit();
  }
}
reset();