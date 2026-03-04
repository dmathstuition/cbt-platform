const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
require('dotenv').config();

// REGISTER
const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role, school_id, class_id, approval_status } = req.body;

    if (!first_name || !last_name || !email || !password || !role || !school_id) {
      return res.status(400).json({ message: 'All fields are required' });
    }

   const schoolRes = await pool.query(
      'SELECT id FROM schools WHERE id=$1 OR school_code=$1',
      [school_id]
    );
    if (schoolRes.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid school code' });
    }
    const resolvedSchoolId = schoolRes.rows[0].id;

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email=$1 AND school_id=$2',
      [email, resolvedSchoolId]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    // Students who self-register are pending, all others are approved
    const status = role === 'student' && approval_status === 'pending' ? 'pending' : 'approved';

    const result = await pool.query(
      `INSERT INTO users [first_name, last_name, email, password_hash, role, resolvedSchoolId, class_id || null, status]
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, first_name, last_name, email, role, approval_status`,
      [first_name, last_name, email, password_hash, role, school_id, class_id || null, status]
    );

    res.status(201).json({
      message: 'Account created successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password, school_id } = req.body;

    if (!email || !password || !school_id) {
      return res.status(400).json({ message: 'Email, password and school ID are required' });
    }

   // Accept either school_id (UUID) or school_code
    const schoolRes = await pool.query(
      'SELECT id FROM schools WHERE id=$1 OR school_code=$1',
      [school_id]
    );
    if (schoolRes.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid school code' });
    }
    const resolvedSchoolId = schoolRes.rows[0].id;

    const result = await pool.query(
      'SELECT * FROM users WHERE email=$1 AND school_id=$2 AND is_active=true',
      [email, resolvedSchoolId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    console.log('Login attempt:', email, 'Users found:', result.rows.length);

    // Check approval status
    if (user.approval_status === 'pending') {
      return res.status(403).json({
        message: '⏳ Your account is pending admin approval. Please wait.'
      });
    }
    if (user.approval_status === 'rejected') {
      return res.status(403).json({
        message: '❌ Your registration was rejected. Please contact your school admin.'
      });
    }

   const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, school_id: user.school_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    // Log login activity
    const { logActivity } = require('./activity.controller');
    await logActivity({
      user_id: user.id,
      school_id: user.school_id,
      action: 'login',
      description: `${user.first_name} logged in`,
      metadata: { role: user.role }
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// CHANGE PASSWORD
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Both current and new password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const result = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(current_password, user.password);
    if (!validPassword) return res.status(401).json({ message: 'Current password is incorrect' });

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashedPassword, req.user.id]);

    const { logActivity } = require('./activity.controller');
    await logActivity({
      user_id: req.user.id,
      school_id: req.user.school_id,
      action: 'password_changed',
      description: 'User changed their password',
      metadata: {}
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, changePassword };