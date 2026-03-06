const express = require('express');
const router = express.Router();
const { register, login, changePassword, refreshToken } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { loginLimiter } = require('../middleware/security.middleware');

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshToken);
router.post('/change-password', protect, changePassword);
router.post('/setup-super-admin', async (req, res) => {
  const pool = require('../config/database');
  const bcrypt = require('bcrypt');
  try {
    const { secret } = req.body;
    if (secret !== 'DMATHS_SETUP_2026') {
      return res.status(403).json({ message: 'Invalid secret' });
    }
    const school = await pool.query(`SELECT id FROM schools WHERE school_code='DMATHS001' LIMIT 1`);
    if (school.rows.length === 0) return res.status(404).json({ message: 'School not found' });

    const existing = await pool.query(`SELECT id FROM users WHERE email='superadmin@dmaths.com'`);
    if (existing.rows.length > 0) return res.status(400).json({ message: 'Super admin already exists' });

    const password_hash = await bcrypt.hash('Password123', 12);
    const result = await pool.query(`
      INSERT INTO users (first_name, last_name, email, password, role, school_id, approval_status, is_active)
      VALUES ('Super', 'Admin', 'superadmin@dmaths.com', $1, 'super_admin', $2, 'approved', true)
      RETURNING id, email, role
    `, [password_hash, school.rows[0].id]);
    
    res.json({ message: '✅ Super admin created!', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;