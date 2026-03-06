const pool = require('../config/database');
const { logActivity } = require('./activity.controller');

// GET DASHBOARD STATS
const getStats = async (req, res) => {
  try {
    const school_id = req.user.school_id;
    const students = await pool.query("SELECT COUNT(*) FROM users WHERE school_id=$1 AND role='student'", [school_id]);
    const teachers = await pool.query("SELECT COUNT(*) FROM users WHERE school_id=$1 AND role='teacher'", [school_id]);
    const exams = await pool.query('SELECT COUNT(*) FROM exams WHERE school_id=$1', [school_id]);
    const sessions = await pool.query(
      `SELECT COUNT(*) FROM exam_sessions es
       JOIN exams e ON es.exam_id = e.id
       WHERE e.school_id=$1 AND es.status='submitted'`, [school_id]
    );
    const passRate = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE es.score >= e.pass_mark) AS passed, COUNT(*) AS total
       FROM exam_sessions es JOIN exams e ON es.exam_id = e.id
       WHERE e.school_id=$1 AND es.status='submitted'`, [school_id]
    );
    const passed = parseInt(passRate.rows[0].passed);
    const total = parseInt(passRate.rows[0].total);
    const rate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    res.json({ stats: {
      students: parseInt(students.rows[0].count),
      teachers: parseInt(teachers.rows[0].count),
      exams: parseInt(exams.rows[0].count),
      submissions: parseInt(sessions.rows[0].count),
      pass_rate: rate
    }});
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
    if (role) { query += ' AND role=$2'; params.push(role); }
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
    const userRes = await pool.query(
      'SELECT is_active, first_name, last_name FROM users WHERE id=$1 AND school_id=$2',
      [id, req.user.school_id]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const newStatus = !userRes.rows[0].is_active;
    await pool.query('UPDATE users SET is_active=$1 WHERE id=$2', [newStatus, id]);
    await logActivity({
      user_id: req.user.id,
      school_id: req.user.school_id,
      action: 'user_status_changed',
      description: `${newStatus ? 'Activated' : 'Deactivated'} user: ${userRes.rows[0].first_name} ${userRes.rows[0].last_name}`,
      metadata: { target_user_id: id, is_active: newStatus }
    });
    res.json({ message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`, is_active: newStatus });
  } catch (error) {
    console.error('Toggle user error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE USER
const deleteUser = async (req, res) => {
  const { id } = req.params;
  const { school_id } = req.user;
  try {
    const userRes = await pool.query(
      `SELECT first_name, last_name, role FROM users WHERE id = $1 AND school_id = $2`,
      [id, school_id]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const deletedUser = userRes.rows[0];

    // Remove foreign key references before deleting user
    await pool.query(`DELETE FROM responses WHERE session_id IN (SELECT id FROM exam_sessions WHERE student_id = $1)`, [id]);
    await pool.query(`DELETE FROM exam_sessions WHERE student_id = $1`, [id]);
    await pool.query(`DELETE FROM parent_student WHERE student_id = $1 OR parent_id = $1`, [id]);
    await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [id]);
    await pool.query(`DELETE FROM activity_logs WHERE user_id = $1`, [id]);

    // Nullify question creator references instead of deleting questions
    await pool.query(`UPDATE questions SET created_by = NULL WHERE created_by = $1`, [id]);

    // Nullify exam creator references
    await pool.query(`UPDATE exams SET created_by = NULL WHERE created_by = $1`, [id]);

    // Delete the user
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);

    await logActivity(req.user.id, school_id, 'user_deleted',
      `Deleted user: ${deletedUser.first_name} ${deletedUser.last_name} (${deletedUser.role})`);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Failed to delete user: ' + err.message });
  }
};

// GET EXAM RESULTS
const getExamResults = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT es.id, es.score, es.status, es.submitted_at,
        u.first_name || ' ' || u.last_name AS student_name,
        u.email AS student_email, e.title AS exam_title,
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

// CREATE USER
const createUser = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role, school_id, class_id, send_credentials } = req.body;
    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ message: 'Email already exists' });
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, role, school_id, class_id, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved')
       RETURNING id, first_name, last_name, email, role`,
      [first_name, last_name, email, hashedPassword, role, school_id || req.user.school_id, class_id || null]
    );
    const user = result.rows[0];
    await logActivity({
      user_id: req.user.id,
      school_id: req.user.school_id,
      action: 'user_created',
      description: `Created ${role} account for ${first_name} ${last_name}`,
      metadata: { new_user_id: user.id, role }
    });
    if (send_credentials) {
      const { sendCredentialsEmail } = require('../services/email.service');
      sendCredentialsEmail({
        to: email, name: `${first_name} ${last_name}`,
        email, password, role,
        loginUrl: 'https://portal-edu123.netlify.app/login'
      });
    }
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('Create user error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET PENDING USERS
const getPendingUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, role, class_id, created_at
       FROM users WHERE school_id=$1 AND approval_status='pending'
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
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: 'Invalid action' });
    const status = action === 'approve' ? 'approved' : 'rejected';
    const result = await pool.query(
      `UPDATE users SET approval_status=$1 WHERE id=$2 AND school_id=$3
       RETURNING first_name, last_name, email`,
      [status, id, req.user.school_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = result.rows[0];
    const { createNotification } = require('./notification.controller');
    await createNotification({
      user_id: id, school_id: req.user.school_id,
      title: action === 'approve' ? '✅ Account Approved!' : '❌ Registration Rejected',
      message: action === 'approve'
        ? 'Your account has been approved. You can now login and access your exams.'
        : 'Your registration was not approved. Please contact your school administrator.',
      type: action === 'approve' ? 'success' : 'error'
    });
    const { sendApprovalEmail } = require('../services/email.service');
    sendApprovalEmail({ to: user.email, studentName: `${user.first_name} ${user.last_name}`, action });
    res.json({ message: `User ${status} successfully`, user });
  } catch (error) {
    console.error('Approve user error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// BULK APPROVE
const bulkApproveUsers = async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'ids array is required' });
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: 'Invalid action' });
    const status = action === 'approve' ? 'approved' : 'rejected';
    const { sendApprovalEmail } = require('../services/email.service');
    const result = await pool.query(
      `UPDATE users SET approval_status=$1 WHERE id = ANY($2::uuid[]) AND school_id=$3
       RETURNING first_name, last_name, email`,
      [status, ids, req.user.school_id]
    );
    for (const user of result.rows) {
      sendApprovalEmail({ to: user.email, studentName: `${user.first_name} ${user.last_name}`, action });
    }
    res.json({ message: `${result.rows.length} users ${status} successfully`, count: result.rows.length });
  } catch (error) {
    console.error('Bulk approve error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET SCHOOL SETTINGS
const getSchoolSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM schools WHERE id=$1', [req.user.school_id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'School not found' });
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
      `UPDATE schools SET name=$1, address=$2, phone=$3, email=$4,
        website=$5, motto=$6, logo_url=$7 WHERE id=$8 RETURNING *`,
      [name, address || null, phone || null, email || null,
       website || null, motto || null, logo_url || null, req.user.school_id]
    );
    await logActivity({
      user_id: req.user.id, school_id: req.user.school_id,
      action: 'settings_updated',
      description: `Updated school settings for ${name}`,
      metadata: { name }
    });
    res.json({ message: 'Settings updated successfully', school: result.rows[0] });
  } catch (error) {
    console.error('Update school settings error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// EXPORT RESULTS TO EXCEL
const exportResults = async (req, res) => {
  try {
    const { exam_id, format = 'excel' } = req.query;

    let query = `
      SELECT 
        u.first_name || ' ' || u.last_name AS student_name,
        u.email AS student_email,
        e.title AS exam_title,
        e.total_marks, e.pass_mark,
        es.score,
        ROUND((es.score::numeric / NULLIF(e.total_marks, 0)) * 100, 1) AS percentage,
        CASE WHEN es.score >= e.pass_mark THEN 'PASSED' ELSE 'FAILED' END AS status,
        es.submitted_at,
        c.name AS class_name,
        s.name AS subject_name
      FROM exam_sessions es
      JOIN users u ON es.student_id = u.id
      JOIN exams e ON es.exam_id = e.id
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN subjects s ON e.subject_id = s.id
      WHERE e.school_id = $1 AND es.status = 'submitted'`;

    let params = [req.user.school_id];

    if (exam_id) {
      query += ' AND e.id = $2';
      params.push(exam_id);
    }

    query += ' ORDER BY e.title, es.score DESC';

    const result = await pool.query(query, params);

    if (format === 'csv') {
      const headers = ['Student Name', 'Email', 'Exam', 'Score', 'Total Marks', 'Percentage', 'Status', 'Class', 'Subject', 'Submitted At'];
      const rows = result.rows.map(r => [
        r.student_name, r.student_email, r.exam_title,
        r.score, r.total_marks, `${r.percentage}%`, r.status,
        r.class_name || 'N/A', r.subject_name || 'N/A',
        new Date(r.submitted_at).toLocaleString()
      ]);
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=results.csv');
      return res.send(csv);
    }

    // Excel format
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Results');

    sheet.columns = [
      { header: 'Student Name', key: 'student_name', width: 25 },
      { header: 'Email', key: 'student_email', width: 30 },
      { header: 'Exam', key: 'exam_title', width: 30 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Total Marks', key: 'total_marks', width: 12 },
      { header: 'Percentage', key: 'percentage', width: 12 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Class', key: 'class_name', width: 15 },
      { header: 'Subject', key: 'subject_name', width: 20 },
      { header: 'Submitted At', key: 'submitted_at', width: 20 }
    ];

    // Style header row
    sheet.getRow(1).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } };
      cell.font = { color: { argb: 'FFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    result.rows.forEach(r => {
      const row = sheet.addRow({
        student_name: r.student_name,
        student_email: r.student_email,
        exam_title: r.exam_title,
        score: r.score,
        total_marks: r.total_marks,
        percentage: `${r.percentage}%`,
        status: r.status,
        class_name: r.class_name || 'N/A',
        subject_name: r.subject_name || 'N/A',
        submitted_at: new Date(r.submitted_at).toLocaleString()
      });

      // Color passed/failed
      const statusCell = row.getCell('status');
      if (r.status === 'PASSED') {
        statusCell.font = { color: { argb: '276749' }, bold: true };
      } else {
        statusCell.font = { color: { argb: '9B2C2C' }, bold: true };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=results.xlsx');
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const getExams = async (req, res) => {
  try {
    const { school_id } = req.user;
    const result = await pool.query(`
      SELECT 
        e.id, e.title, e.type, e.status, e.duration_minutes,
        e.pass_mark, e.total_marks, e.created_at,
        u.first_name || ' ' || u.last_name AS created_by_name,
        COUNT(DISTINCT eq.question_id) AS question_count,
        COUNT(DISTINCT es.id) AS submission_count
      FROM exams e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN exam_questions eq ON e.id = eq.exam_id
      LEFT JOIN exam_sessions es ON e.id = es.exam_id AND es.status = 'submitted'
      WHERE e.school_id = $1
      GROUP BY e.id, u.first_name, u.last_name
      ORDER BY e.created_at DESC
    `, [school_id]);
    res.json({ exams: result.rows });
  } catch (err) {
    console.error('getExams error:', err);
    res.status(500).json({ message: 'Failed to load exams' });
  }
};

const updateExamStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { school_id } = req.user;
    const validStatuses = ['draft', 'active', 'scheduled', 'completed', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const result = await pool.query(
      `UPDATE exams SET status = $1 WHERE id = $2 AND school_id = $3 RETURNING id, title, status`,
      [status, id, school_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    await logActivity(req.user.id, school_id, 'exam_status_changed',
      `Admin changed exam "${result.rows[0].title}" status to ${status}`);
    res.json({ message: 'Status updated', exam: result.rows[0] });
  } catch (err) {
    console.error('updateExamStatus error:', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
};

const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { school_id } = req.user;
    const examRes = await pool.query(
      `SELECT title FROM exams WHERE id = $1 AND school_id = $2`, [id, school_id]
    );
    if (examRes.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    const title = examRes.rows[0].title;
    // Delete related records first
    await pool.query(`DELETE FROM responses WHERE session_id IN (SELECT id FROM exam_sessions WHERE exam_id = $1)`, [id]);
    await pool.query(`DELETE FROM exam_sessions WHERE exam_id = $1`, [id]);
    await pool.query(`DELETE FROM exam_questions WHERE exam_id = $1`, [id]);
    await pool.query(`DELETE FROM exams WHERE id = $1`, [id]);
    await logActivity(req.user.id, school_id, 'exam_deleted', `Admin deleted exam "${title}"`);
    res.json({ message: 'Exam deleted successfully' });
  } catch (err) {
    console.error('deleteExam error:', err);
    res.status(500).json({ message: 'Failed to delete exam' });
  }
};

module.exports = {
  getStats, getUsers, toggleUserStatus, deleteUser,
  getExamResults, createUser, getPendingUsers,
  approveUser, bulkApproveUsers, getSchoolSettings, 
  updateSchoolSettings, exportResults,getExams, updateExamStatus, deleteExam
};