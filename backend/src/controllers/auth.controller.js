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

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email=$1 AND school_id=$2',
      [email, school_id]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    // Students who self-register are pending, all others are approved
    const status = role === 'student' && approval_status === 'pending' ? 'pending' : 'approved';

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, school_id, class_id, approval_status)
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

    const result = await pool.query(
      'SELECT * FROM users WHERE email=$1 AND school_id=$2 AND is_active=true',
      [email, school_id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

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

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, school_id: user.school_id },
      process.env.JWT_ACCESS_SECRET,
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

module.exports = { register, login };