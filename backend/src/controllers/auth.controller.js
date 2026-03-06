const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const {
  trackFailedLogin, resetLoginAttempts,
  isLockedOut, getRemainingLockout,
  validatePassword, validateEmail
} = require('../middleware/security.middleware');
require('dotenv').config();

const generateTokens = (user) => {
  const payload = { id: user.id, role: user.role, school_id: user.school_id };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// REGISTER
const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role, school_id, class_id, approval_status } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !password || !role || !school_id) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate name lengths
    if (first_name.length < 2 || last_name.length < 2) {
      return res.status(400).json({ message: 'Names must be at least 2 characters' });
    }
    if (first_name.length > 50 || last_name.length > 50) {
      return res.status(400).json({ message: 'Names must be under 50 characters' });
    }

    // Validate password strength
    const pwErrors = validatePassword(password);
    if (pwErrors.length > 0) {
      return res.status(400).json({ message: `Password must contain: ${pwErrors.join(', ')}` });
    }

    // Validate role
    const allowedRoles = ['student', 'teacher', 'parent'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const schoolRes = await pool.query(
      'SELECT id FROM schools WHERE school_code=$1 OR id::text=$1',
      [school_id]
    );
    if (schoolRes.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid school code' });
    }
    const resolvedSchoolId = schoolRes.rows[0].id;

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email=$1 AND school_id=$2',
      [email.toLowerCase(), resolvedSchoolId]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const status = role === 'student' && approval_status === 'pending' ? 'pending' : 'approved';

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, school_id, class_id, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, first_name, last_name, email, role, approval_status`,
      [first_name, last_name, email.toLowerCase(), password_hash, role, resolvedSchoolId, class_id || null, status]
    );

    res.status(201).json({
      message: 'Account created successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password, school_id } = req.body;

    // Validate inputs
    if (!email || !password || !school_id) {
      return res.status(400).json({ message: 'Email, password and school ID are required' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const lockKey = `${email.toLowerCase()}:${school_id}`;

    // Check lockout
    if (isLockedOut(lockKey)) {
      const mins = getRemainingLockout(lockKey);
      return res.status(429).json({
        message: `Account temporarily locked due to too many failed attempts. Try again in ${mins} minute(s).`
      });
    }

    const schoolRes = await pool.query(
      'SELECT id FROM schools WHERE school_code=$1 OR id::text=$1',
      [school_id]
    );
    if (schoolRes.rows.length === 0) {
      trackFailedLogin(lockKey);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const resolvedSchoolId = schoolRes.rows[0].id;

    const result = await pool.query(
      'SELECT * FROM users WHERE email=$1 AND school_id=$2 AND is_active=true',
      [email.toLowerCase(), resolvedSchoolId]
    );

    if (result.rows.length === 0) {
      trackFailedLogin(lockKey);
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

    // Check password against both column names (password_hash and password)
    const storedHash = user.password_hash || user.password;
    const validPassword = await bcrypt.compare(password, storedHash);

    if (!validPassword) {
      const record = trackFailedLogin(lockKey);
      const remaining = LOGIN_MAX_ATTEMPTS - record.attempts;
      if (remaining > 0) {
        return res.status(401).json({
          message: `Invalid credentials. ${remaining} attempt(s) remaining before lockout.`
        });
      }
      return res.status(429).json({
        message: 'Too many failed attempts. Account locked for 15 minutes.'
      });
    }

    // Success — reset attempts
    resetLoginAttempts(lockKey);

    const { accessToken, refreshToken } = generateTokens(user);

    // Audit log
    try {
      const { logActivity } = require('./activity.controller');
      await logActivity({
        user_id: user.id,
        school_id: user.school_id,
        action: 'login',
        description: `${user.first_name} ${user.last_name} logged in`,
        metadata: { role: user.role, ip: req.ip }
      });
    } catch (e) { /* non-blocking */ }

    res.json({
      message: 'Login successful',
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        school_id: user.school_id
      }
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const LOGIN_MAX_ATTEMPTS = 5;

// REFRESH TOKEN
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ message: 'Refresh token required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, role, school_id, is_active FROM users WHERE id=$1',
      [decoded.id]
    );
    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    const user = result.rows[0];
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    res.json({ token: accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

// CHANGE PASSWORD
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Both current and new password are required' });
    }

    // Validate new password strength
    const pwErrors = validatePassword(new_password);
    if (pwErrors.length > 0) {
      return res.status(400).json({ message: `New password must contain: ${pwErrors.join(', ')}` });
    }

    if (current_password === new_password) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    const result = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = result.rows[0];
    const storedHash = user.password_hash || user.password;
    const validPassword = await bcrypt.compare(current_password, storedHash);
    if (!validPassword) return res.status(401).json({ message: 'Current password is incorrect' });

    const hashedPassword = await bcrypt.hash(new_password, 12);
    // Update whichever column exists
    const col = user.password_hash !== undefined ? 'password_hash' : 'password';
    await pool.query(`UPDATE users SET ${col}=$1 WHERE id=$2`, [hashedPassword, req.user.id]);

    try {
      const { logActivity } = require('./activity.controller');
      await logActivity({
        user_id: req.user.id,
        school_id: req.user.school_id,
        action: 'password_changed',
        description: 'User changed their password',
        metadata: { ip: req.ip }
      });
    } catch (e) { /* non-blocking */ }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, refreshToken, changePassword };