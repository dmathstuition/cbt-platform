const pool = require('../config/database');

// LINK PARENT TO STUDENT
const linkStudent = async (req, res) => {
  try {
    const { student_email } = req.body;
    const parent_id = req.user.id;

    if (!student_email) {
      return res.status(400).json({ message: 'student_email is required' });
    }

    // Find student
    const student = await pool.query(
      `SELECT id, first_name, last_name, email 
       FROM users 
       WHERE email=$1 AND school_id=$2 AND role='student'`,
      [student_email, req.user.school_id]
    );

    if (student.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found in your school' });
    }

    const studentData = student.rows[0];

    // Check not already linked
    const existing = await pool.query(
      'SELECT id FROM parent_student WHERE parent_id=$1 AND student_id=$2',
      [parent_id, studentData.id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Already linked to this student' });
    }

    // Create link
    await pool.query(
      'INSERT INTO parent_student (parent_id, student_id) VALUES ($1, $2)',
      [parent_id, studentData.id]
    );

    res.json({
      message: `Successfully linked to ${studentData.first_name} ${studentData.last_name}`,
      student: studentData
    });

  } catch (error) {
    console.error('Link student error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET LINKED CHILDREN
const getChildren = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email
       FROM parent_student ps
       JOIN users u ON ps.student_id = u.id
       WHERE ps.parent_id = $1`,
      [req.user.id]
    );

    res.json({ children: result.rows });

  } catch (error) {
    console.error('Get children error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET CHILD RESULTS
const getChildResults = async (req, res) => {
  try {
    const { student_id } = req.params;

    // Verify parent is linked to this student
    const link = await pool.query(
      'SELECT id FROM parent_student WHERE parent_id=$1 AND student_id=$2',
      [req.user.id, student_id]
    );

    if (link.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized to view this student' });
    }

    // Get student info
    const student = await pool.query(
      'SELECT first_name, last_name, email FROM users WHERE id=$1',
      [student_id]
    );

    // Get results
    const results = await pool.query(
      `SELECT 
        es.id, es.score, es.submitted_at,
        e.title AS exam_title, e.total_marks, e.pass_mark, e.type,
        ROUND((es.score / NULLIF(e.total_marks, 0)) * 100, 1) AS percentage,
        CASE WHEN es.score >= e.pass_mark THEN true ELSE false END AS passed
       FROM exam_sessions es
       JOIN exams e ON es.exam_id = e.id
       WHERE es.student_id=$1 AND es.status='submitted'
       ORDER BY es.submitted_at DESC`,
      [student_id]
    );

    // Summary stats
    const total = results.rows.length;
    const passed = results.rows.filter(r => r.passed).length;
    const avg = total > 0
      ? (results.rows.reduce((sum, r) => sum + parseFloat(r.percentage || 0), 0) / total).toFixed(1)
      : 0;

    res.json({
      student: student.rows[0],
      results: results.rows,
      summary: { total, passed, failed: total - passed, avg_percentage: avg }
    });

  } catch (error) {
    console.error('Get child results error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// UNLINK STUDENT
const unlinkStudent = async (req, res) => {
  try {
    const { student_id } = req.params;

    await pool.query(
      'DELETE FROM parent_student WHERE parent_id=$1 AND student_id=$2',
      [req.user.id, student_id]
    );

    res.json({ message: 'Student unlinked successfully' });

  } catch (error) {
    console.error('Unlink student error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin links parent to student directly
const linkParentByAdmin = async (req, res) => {
  try {
    const { parent_id, student_id } = req.body;
    if (!parent_id || !student_id) {
      return res.status(400).json({ message: 'parent_id and student_id are required' });
    }
    await pool.query(
      `INSERT INTO parent_student (parent_id, student_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [parent_id, student_id]
    );
    res.json({ message: 'Parent linked to student successfully' });
  } catch (error) {
    console.error('Link parent error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { linkStudent, getChildren, getChildResults, unlinkStudent,linkParentByAdmin };