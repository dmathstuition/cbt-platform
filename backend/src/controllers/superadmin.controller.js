const pool = require('../config/database');
const { logActivity } = require('./activity.controller');
const bcrypt = require('bcrypt');

// GET ALL SCHOOLS WITH STATS
const getAllSchools = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id, s.name, s.school_code, s.email, s.phone, s.address,
        s.created_at, s.is_active,
        COUNT(DISTINCT CASE WHEN u.role='student' THEN u.id END) AS students,
        COUNT(DISTINCT CASE WHEN u.role='teacher' THEN u.id END) AS teachers,
        COUNT(DISTINCT CASE WHEN u.role='school_admin' THEN u.id END) AS admins,
        COUNT(DISTINCT e.id) AS exams,
        COUNT(DISTINCT es.id) AS submissions
      FROM schools s
      LEFT JOIN users u ON u.school_id = s.id AND u.is_active = true
      LEFT JOIN exams e ON e.school_id = s.id
      LEFT JOIN exam_sessions es ON es.exam_id = e.id AND es.status = 'submitted'
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.json({ schools: result.rows });
  } catch (err) {
    console.error('getAllSchools error:', err);
    res.status(500).json({ message: 'Failed to load schools' });
  }
};

// GET SINGLE SCHOOL DETAILS
const getSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const school = await pool.query(`SELECT * FROM schools WHERE id=$1`, [id]);
    if (school.rows.length === 0) return res.status(404).json({ message: 'School not found' });

    const users = await pool.query(`
      SELECT id, first_name, last_name, email, role, is_active, approval_status, created_at
      FROM users WHERE school_id=$1 ORDER BY role, created_at DESC
    `, [id]);

    const exams = await pool.query(`
      SELECT e.id, e.title, e.status, e.type, e.created_at,
        u.first_name || ' ' || u.last_name AS created_by,
        COUNT(es.id) AS submissions
      FROM exams e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN exam_sessions es ON es.exam_id = e.id AND es.status = 'submitted'
      WHERE e.school_id=$1
      GROUP BY e.id, u.first_name, u.last_name
      ORDER BY e.created_at DESC
      LIMIT 20
    `, [id]);

    res.json({ school: school.rows[0], users: users.rows, exams: exams.rows });
  } catch (err) {
    console.error('getSchool error:', err);
    res.status(500).json({ message: 'Failed to load school' });
  }
};

// CREATE SCHOOL
const createSchool = async (req, res) => {
  try {
    const { name, school_code, email, phone, address, admin_first_name, admin_last_name, admin_email, admin_password } = req.body;

    if (!name || !school_code || !admin_first_name || !admin_last_name || !admin_email || !admin_password) {
      return res.status(400).json({ message: 'School name, code, and admin details are required' });
    }

    // Check school code unique
    const existing = await pool.query('SELECT id FROM schools WHERE school_code=$1', [school_code.toUpperCase()]);
    if (existing.rows.length > 0) return res.status(400).json({ message: 'School code already exists' });

    // Create school
    const schoolRes = await pool.query(`
      INSERT INTO schools (name, school_code, email, phone, address, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *
    `, [name, school_code.toUpperCase(), email || null, phone || null, address || null]);

    const school = schoolRes.rows[0];

    // Create admin account for school
    const password_hash = await bcrypt.hash(admin_password, 12);
    const adminRes = await pool.query(`
      INSERT INTO users (first_name, last_name, email, password_hash, role, school_id, approval_status, is_active)
      VALUES ($1, $2, $3, $4, 'school_admin', $5, 'approved', true)
      RETURNING id, first_name, last_name, email, role
    `, [admin_first_name, admin_last_name, admin_email.toLowerCase(), password_hash, school.id]);

    await logActivity({
      user_id: req.user.id,
      school_id: req.user.school_id,
      action: 'school_created',
      description: `Super admin created school: ${name} (${school_code})`,
      metadata: { new_school_id: school.id }
    });

    res.status(201).json({
      message: 'School created successfully',
      school,
      admin: adminRes.rows[0]
    });
  } catch (err) {
    console.error('createSchool error:', err);
    res.status(500).json({ message: 'Failed to create school' });
  }
};

// TOGGLE SCHOOL ACTIVE STATUS
const toggleSchoolStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const school = await pool.query('SELECT name, is_active FROM schools WHERE id=$1', [id]);
    if (school.rows.length === 0) return res.status(404).json({ message: 'School not found' });

    const newStatus = !school.rows[0].is_active;
    await pool.query('UPDATE schools SET is_active=$1 WHERE id=$2', [newStatus, id]);

    // Also deactivate/activate all users in school
    await pool.query('UPDATE users SET is_active=$1 WHERE school_id=$2', [newStatus, id]);

    await logActivity({
      user_id: req.user.id,
      school_id: req.user.school_id,
      action: 'school_status_changed',
      description: `${newStatus ? 'Activated' : 'Deactivated'} school: ${school.rows[0].name}`,
      metadata: { school_id: id, is_active: newStatus }
    });

    res.json({ message: `School ${newStatus ? 'activated' : 'deactivated'}`, is_active: newStatus });
  } catch (err) {
    console.error('toggleSchoolStatus error:', err);
    res.status(500).json({ message: 'Failed to update school status' });
  }
};

// UPDATE SCHOOL
const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, motto } = req.body;
    if (!name) return res.status(400).json({ message: 'School name is required' });

    const result = await pool.query(`
      UPDATE schools SET name=$1, email=$2, phone=$3, address=$4, motto=$5
      WHERE id=$6 RETURNING *
    `, [name, email || null, phone || null, address || null, motto || null, id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'School not found' });
    res.json({ message: 'School updated', school: result.rows[0] });
  } catch (err) {
    console.error('updateSchool error:', err);
    res.status(500).json({ message: 'Failed to update school' });
  }
};

// GET PLATFORM STATS
const getPlatformStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM schools WHERE is_active=true) AS active_schools,
        (SELECT COUNT(*) FROM schools) AS total_schools,
        (SELECT COUNT(*) FROM users WHERE is_active=true) AS total_users,
        (SELECT COUNT(*) FROM users WHERE role='student' AND is_active=true) AS total_students,
        (SELECT COUNT(*) FROM users WHERE role='teacher' AND is_active=true) AS total_teachers,
        (SELECT COUNT(*) FROM exams) AS total_exams,
        (SELECT COUNT(*) FROM exam_sessions WHERE status='submitted') AS total_submissions,
        (SELECT COUNT(*) FROM users WHERE approval_status='pending') AS pending_approvals
    `);

    // Monthly school growth
    const growth = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'Mon YY') AS month,
        DATE_TRUNC('month', created_at) AS month_date,
        COUNT(*) AS new_schools
      FROM schools
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month_date, month
      ORDER BY month_date ASC
    `);

    // Top schools by activity
    const topSchools = await pool.query(`
      SELECT s.name, s.school_code,
        COUNT(DISTINCT es.id) AS submissions,
        COUNT(DISTINCT u.id) AS users
      FROM schools s
      LEFT JOIN users u ON u.school_id=s.id AND u.is_active=true
      LEFT JOIN exams e ON e.school_id=s.id
      LEFT JOIN exam_sessions es ON es.exam_id=e.id AND es.status='submitted'
      GROUP BY s.id
      ORDER BY submissions DESC
      LIMIT 5
    `);

    res.json({
      stats: result.rows[0],
      growth: growth.rows,
      topSchools: topSchools.rows
    });
  } catch (err) {
    console.error('getPlatformStats error:', err);
    res.status(500).json({ message: 'Failed to load platform stats' });
  }
};

// DELETE SCHOOL (dangerous - cascade everything)
const deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirm } = req.body;
    if (confirm !== 'DELETE') {
      return res.status(400).json({ message: 'Type DELETE to confirm' });
    }

    const school = await pool.query('SELECT name FROM schools WHERE id=$1', [id]);
    if (school.rows.length === 0) return res.status(404).json({ message: 'School not found' });

    // Prevent deleting own school
    if (id === req.user.school_id) {
      return res.status(400).json({ message: 'Cannot delete your own school' });
    }

    const name = school.rows[0].name;

    // Cascade delete
    await pool.query(`DELETE FROM responses WHERE session_id IN (
      SELECT es.id FROM exam_sessions es JOIN exams e ON es.exam_id=e.id WHERE e.school_id=$1
    )`, [id]);
    await pool.query(`DELETE FROM exam_sessions WHERE exam_id IN (SELECT id FROM exams WHERE school_id=$1)`, [id]);
    await pool.query(`DELETE FROM exam_questions WHERE exam_id IN (SELECT id FROM exams WHERE school_id=$1)`, [id]);
    await pool.query(`DELETE FROM exams WHERE school_id=$1`, [id]);
    await pool.query(`DELETE FROM notifications WHERE school_id=$1`, [id]);
    await pool.query(`DELETE FROM activity_logs WHERE school_id=$1`, [id]);
    await pool.query(`DELETE FROM questions WHERE school_id=$1`, [id]);
    await pool.query(`DELETE FROM parent_student WHERE student_id IN (SELECT id FROM users WHERE school_id=$1)`, [id]);
    await pool.query(`DELETE FROM users WHERE school_id=$1`, [id]);
    await pool.query(`DELETE FROM schools WHERE id=$1`, [id]);

    await logActivity({
      user_id: req.user.id,
      school_id: req.user.school_id,
      action: 'school_deleted',
      description: `Super admin deleted school: ${name}`,
      metadata: { deleted_school_id: id }
    });

    res.json({ message: `School "${name}" deleted permanently` });
  } catch (err) {
    console.error('deleteSchool error:', err);
    res.status(500).json({ message: 'Failed to delete school' });
  }
};

module.exports = {
  getAllSchools, getSchool, createSchool,
  toggleSchoolStatus, updateSchool,
  getPlatformStats, deleteSchool
};