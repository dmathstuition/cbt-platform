const bcrypt = require('bcrypt');
const pool = require('../config/database');
require('dotenv').config();

async function createSuperAdmin() {
  try {
    const password_hash = await bcrypt.hash('Password123', 12);

    // Get the school ID
    const school = await pool.query(
      `SELECT id FROM schools WHERE school_code = 'DMATHS001' LIMIT 1`
    );
    
    if (school.rows.length === 0) {
      console.log('❌ School not found!');
      process.exit(1);
    }

    const school_id = school.rows[0].id;

    // Check if super admin already exists
    const existing = await pool.query(
      `SELECT id FROM users WHERE email = 'superadmin@dmaths.com'`
    );

    if (existing.rows.length > 0) {
      console.log('⚠️ Super admin already exists!');
      process.exit(0);
    }

    const result = await pool.query(`
      INSERT INTO users (first_name, last_name, email, password_hash, role, school_id, approval_status, is_active)
      VALUES ('Super', 'Admin', 'superadmin@dmaths.com', $1, 'super_admin', $2, 'approved', true)
      RETURNING id, email, role
    `, [password_hash, school_id]);

    console.log('✅ Super admin created:', result.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createSuperAdmin();