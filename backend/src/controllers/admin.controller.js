const pool = require('../config/database');

// GET DASHBOARD STATS
const getStats = async (req, res) => {
  try {
    const school_id = req.user.school_id;

    const students = await pool.query(
      "SELECT COUNT(*) FROM users WHERE school_id=$1 AND role='student'",
      [school_id]
    );
    const teachers = await pool.query(
      "SELECT COUNT(*) FROM users WHERE school_id=$1 AND role='teacher'",
      [school_id]
    );
    const exams = await pool.query(
      'SELECT COUNT(*) FROM exams WHERE school_id=$1',
      [school_id]
    );
    const sessions = await pool.query(
      `SELECT COUNT(*) FROM exam_sessions es
       JOIN exams e ON es.exam_id = e.id
       WHERE e.school_id=$1 AND es.status='submitted'`,
      [school_id]
    );
    const passRate = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE es.score >= e.pass_mark) AS passed,
        COUNT(*) AS total
       FROM exam_sessions es
       JOIN exams e ON es.exam_id = e.id
       WHERE e.school_id=$1 AND es.status='submitted'`,
      [school_id]
    );

    const passed = parseInt(passRate.rows[0].passed);
    const total = parseInt(passRate.rows[0].total);
    const rate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    res.json({
      stats: {
        students: parseInt(students.rows[0].count),
        teachers: parseInt(teachers.rows[0].count),
        exams: parseInt(exams.rows[0].count),
        submissions: parseInt(sessions.rows[0].count),
        pass_rate: rate
      }
    });

  } catch (error) {
    console.error('Get stats error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET ALL USERS
const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = `SELECT id, first_name, last_name, email, role, is_active, created_at 
                 FROM users WHERE school_id=$1`;
    let params = [req.user.school_id];

    if (role) {
      query += ' AND role=$2';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json({ users: result.rows });

  } catch (error) {
    console.error('Get users error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// TOGGLE USER ACTIVE STATUS
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await pool.query(
      'SELECT is_active FROM users WHERE id=$1 AND school_id=$2',
      [id, req.user.school_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newStatus = !user.rows[0].is_active;
    await pool.query(
      'UPDATE users SET is_active=$1 WHERE id=$2',
      [newStatus, id]
    );

    res.json({
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_active: newStatus
    });

  } catch (error) {
    console.error('Toggle user error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete related records first to avoid foreign key errors
    await pool.query('DELETE FROM exam_sessions WHERE student_id=$1', [id]);
    await pool.query('DELETE FROM responses WHERE session_id IN (SELECT id FROM exam_sessions WHERE student_id=$1)', [id]);
    await pool.query('DELETE FROM parent_student WHERE student_id=$1 OR parent_id=$1', [id]);
    await pool.query('DELETE FROM teacher_assignments WHERE teacher_id=$1', [id]);

    await pool.query(
      'DELETE FROM users WHERE id=$1 AND school_id=$2',
      [id, req.user.school_id]
    );

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET EXAM RESULTS
const getExamResults = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        es.id, es.score, es.status, es.submitted_at,
        u.first_name || ' ' || u.last_name AS student_name,
        u.email AS student_email,
        e.title AS exam_title,
        e.total_marks, e.pass_mark,
        CASE WHEN es.score >= e.pass_mark THEN true ELSE false END AS passed
       FROM exam_sessions es
       JOIN users u ON es.student_id = u.id
       JOIN exams e ON es.exam_id = e.id
       WHERE e.school_id=$1 AND es.status='submitted'
       ORDER BY es.submitted_at DESC`,
      [req.user.school_id]
    );

    res.json({ results: result.rows });

  } catch (error) {
    console.error('Get results error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// CREATE USER (Admin)
const createUser = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role, school_id, class_id, send_credentials } = req.body;

    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const result = await pool.query(
      `INSERT INTO users 
        (first_name, last_name, email, password, role, school_id, class_id, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved')
       RETURNING id, first_name, last_name, email, role`,
      [first_name, last_name, email, hashedPassword, role,
       school_id || req.user.school_id, class_id || null]
    );

    const user = result.rows[0];

    // Send credentials email
    if (send_credentials) {
      const { sendCredentialsEmail } = require('../services/email.service');
      sendCredentialsEmail({
        to: email,
        name: `${first_name} ${last_name}`,
        email,
        password,
        role
      });
    }

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('Create user error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET PENDING REGISTRATIONS
const getPendingUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, role, class_id, created_at
       FROM users
       WHERE school_id=$1 AND approval_status='pending'
       ORDER BY created_at DESC`,
      [req.user.school_id]
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get pending users error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// APPROVE OR REJECT USER
const approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject' });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';

    const result = await pool.query(
      `UPDATE users SET approval_status=$1 WHERE id=$2 AND school_id=$3
       RETURNING first_name, last_name, email`,
      [status, id, req.user.school_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
 // Create in-app notification
    const { createNotification } = require('./notification.controller');
    await createNotification({
      user_id: id,
      school_id: req.user.school_id,
      title: action === 'approve' ? '✅ Account Approved!' : '❌ Registration Rejected',
      message: action === 'approve'
        ? 'Your account has been approved. You can now login and access your exams.'
        : 'Your registration was not approved. Please contact your school administrator.',
      type: action === 'approve' ? 'success' : 'error'
    });
 
    // Send email notification
    const { sendApprovalEmail } = require('../services/email.service');
    sendApprovalEmail({
      to: user.email,
      studentName: `${user.first_name} ${user.last_name}`,
      action
    });

    res.json({ message: `User ${status} successfully`, user });
  } catch (error) {
    console.error('Approve user error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const bulkApproveUsers = async (req, res) => {
  try {
    const { ids, action } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids array is required' });
    }
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject' });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    const { sendApprovalEmail } = require('../services/email.service');

    const result = await pool.query(
      `UPDATE users SET approval_status=$1
       WHERE id = ANY($2::uuid[]) AND school_id=$3
       RETURNING first_name, last_name, email`,
      [status, ids, req.user.school_id]
    );

    // Send emails to all
    for (const user of result.rows) {
      sendApprovalEmail({
        to: user.email,
        studentName: `${user.first_name} ${user.last_name}`,
        action
      });
    }

    res.json({
      message: `${result.rows.length} users ${status} successfully`,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Bulk approve error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET SCHOOL SETTINGS
const getSchoolSettings = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM schools WHERE id=$1',
      [req.user.school_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'School not found' });
    }
    res.json({ school: result.rows[0] });
  } catch (error) {
    console.error('Get school settings error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE SCHOOL SETTINGS
const updateSchoolSettings = async (req, res) => {
  try {
    const { name, address, phone, email, website, motto, logo_url } = req.body;
    if (!name) return res.status(400).json({ message: 'School name is required' });

    const result = await pool.query(
      `UPDATE schools SET 
        name=$1, address=$2, phone=$3, email=$4,
        website=$5, motto=$6, logo_url=$7
       WHERE id=$8 RETURNING *`,
      [name, address || null, phone || null, email || null,
       website || null, motto || null, logo_url || null,
       req.user.school_id]
    );

    res.json({ message: 'Settings updated successfully', school: result.rows[0] });
  } catch (error) {
    console.error('Update school settings error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getStats, getUsers, toggleUserStatus, deleteUser,
  getExamResults, createUser, getPendingUsers,
  approveUser, bulkApproveUsers, getSchoolSettings, updateSchoolSettings
};