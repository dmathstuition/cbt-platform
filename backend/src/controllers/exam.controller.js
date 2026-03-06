const pool = require('../config/database');

// CREATE EXAM
const createExam = async (req, res) => {
  try {
    const {
      title, type, subject_id, class_id,
      duration_minutes, pass_mark, start_at, end_at, settings
    } = req.body;

    if (!title || !type || !duration_minutes) {
      return res.status(400).json({ message: 'Title, type and duration are required' });
    }

    const initialStatus = start_at ? 'scheduled' : 'draft';

    const result = await pool.query(
      `INSERT INTO exams 
        (title, type, subject_id, class_id, duration_minutes, pass_mark, 
         start_at, end_at, settings, school_id, created_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [title, type, subject_id, class_id, duration_minutes, pass_mark || 50,
       start_at || null, end_at || null, settings || {},
       req.user.school_id, req.user.id, initialStatus]
    );

    const { logActivity } = require('./activity.controller');
    await logActivity({
      user_id: req.user.id,
      school_id: req.user.school_id,
      action: 'exam_created',
      description: `Created exam: ${title}`,
      metadata: { exam_id: result.rows[0].id, title }
    });
 
    res.status(201).json({
      message: 'Exam created successfully',
      exam: result.rows[0]
    });

  } catch (error) {
    console.error('Create exam error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const getExams = async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'student') {
      // Students see exams for their class OR exams with no class assigned
      const student = await pool.query(
        'SELECT class_id FROM users WHERE id=$1',
        [req.user.id]
      );
      const class_id = student.rows[0]?.class_id;

if (class_id) {
        query = `
          SELECT e.*, u.first_name || ' ' || u.last_name AS creator_name
          FROM exams e
          LEFT JOIN users u ON e.created_by = u.id
          WHERE e.school_id = $1
          AND e.status IN ('active', 'scheduled')
          AND (e.class_id IS NULL OR e.class_id = $2)
          ORDER BY e.created_at DESC`;
        params = [req.user.school_id, class_id];
      } else {
        // Student has no class assigned — show all exams with no class restriction
        query = `
          SELECT e.*, u.first_name || ' ' || u.last_name AS creator_name
          FROM exams e
          LEFT JOIN users u ON e.created_by = u.id
          WHERE e.school_id = $1
          AND e.status IN ('active', 'scheduled')
          ORDER BY e.created_at DESC`;
        params = [req.user.school_id];
      }


    } else if (req.user.role === 'teacher') {
      // Teachers only see exams they created
      query = `
        SELECT e.*, u.first_name || ' ' || u.last_name AS creator_name
        FROM exams e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.school_id = $1 AND e.created_by = $2
        ORDER BY e.created_at DESC`;
      params = [req.user.school_id, req.user.id];

    } else {
      // Admins see all exams
      query = `
        SELECT e.*, u.first_name || ' ' || u.last_name AS creator_name
        FROM exams e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.school_id = $1
        ORDER BY e.created_at DESC`;
      params = [req.user.school_id];
    }

    const result = await pool.query(query, params);
    res.json({ exams: result.rows });

  } catch (error) {
    console.error('Get exams error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET SINGLE EXAM
const getExam = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await pool.query(
      'SELECT * FROM exams WHERE id=$1 AND school_id=$2',
      [id, req.user.school_id]
    );

    if (exam.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const questions = await pool.query(
      `SELECT q.* FROM questions q
       INNER JOIN exam_questions eq ON q.id = eq.question_id
       WHERE eq.exam_id = $1`,
      [id]
    );

    res.json({
      exam: exam.rows[0],
      questions: questions.rows
    });

  } catch (error) {
    console.error('Get exam error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE EXAM STATUS
const updateExamStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'scheduled', 'active', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE exams SET status=$1 WHERE id=$2 AND school_id=$3 RETURNING *',
      [status, id, req.user.school_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    res.json({ message: 'Exam updated', exam: result.rows[0] });

  } catch (error) {
    console.error('Update exam error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE EXAM
const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'DELETE FROM exams WHERE id=$1 AND school_id=$2',
      [id, req.user.school_id]
    );

    res.json({ message: 'Exam deleted successfully' });

  } catch (error) {
    console.error('Delete exam error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET EXAM RESULTS WITH ANALYTICS (Teacher)
const getExamResults = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await pool.query(
      'SELECT * FROM exams WHERE id=$1 AND school_id=$2',
      [id, req.user.school_id]
    );
    if (exam.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const results = await pool.query(
      `SELECT 
        es.id, es.score, es.submitted_at, es.started_at,
        u.first_name || ' ' || u.last_name AS student_name,
        u.email AS student_email,
        e.total_marks, e.pass_mark,
        ROUND((es.score / NULLIF(e.total_marks, 0)) * 100, 1) AS percentage,
        CASE WHEN es.score >= e.pass_mark THEN true ELSE false END AS passed
       FROM exam_sessions es
       JOIN users u ON es.student_id = u.id
       JOIN exams e ON es.exam_id = e.id
       WHERE es.exam_id=$1 AND es.status='submitted'
       ORDER BY es.score DESC`,
      [id]
    );

    const total = results.rows.length;
    const passed = results.rows.filter(r => r.passed).length;
    const scores = results.rows.map(r => parseFloat(r.percentage || 0));
    const avg = total > 0 ? (scores.reduce((a, b) => a + b, 0) / total).toFixed(1) : 0;
    const highest = total > 0 ? Math.max(...scores).toFixed(1) : 0;
    const lowest = total > 0 ? Math.min(...scores).toFixed(1) : 0;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    res.json({
      exam: exam.rows[0],
      results: results.rows,
      analytics: { total, passed, failed: total - passed, avg, highest, lowest, passRate }
    });

  } catch (error) {
    console.error('Get exam results error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET STUDENTS WHO HAVEN'T TAKEN EXAM
const getMissingStudents = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await pool.query(
      'SELECT * FROM exams WHERE id=$1 AND school_id=$2',
      [id, req.user.school_id]
    );
    if (exam.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const examData = exam.rows[0];

    // Get all students in the exam's class (or all students if no class)
    let studentsQuery;
    let studentsParams;

    if (examData.class_id) {
      studentsQuery = `
        SELECT id, first_name, last_name, email 
        FROM users 
        WHERE school_id=$1 AND role='student' 
        AND class_id=$2 AND is_active=true AND approval_status='approved'`;
      studentsParams = [req.user.school_id, examData.class_id];
    } else {
      studentsQuery = `
        SELECT id, first_name, last_name, email 
        FROM users 
        WHERE school_id=$1 AND role='student' 
        AND is_active=true AND approval_status='approved'`;
      studentsParams = [req.user.school_id];
    }

    const allStudents = await pool.query(studentsQuery, studentsParams);

    // Get students who have started/submitted
    const taken = await pool.query(
      `SELECT student_id, status, score, submitted_at 
       FROM exam_sessions WHERE exam_id=$1`,
      [id]
    );

    const takenMap = {};
    taken.rows.forEach(t => { takenMap[t.student_id] = t; });

    const missing = allStudents.rows.filter(s => !takenMap[s.id]);
    const submitted = allStudents.rows.filter(s => takenMap[s.id]?.status === 'submitted');
    const inProgress = allStudents.rows.filter(s => takenMap[s.id]?.status === 'in_progress');

    res.json({
      exam: examData,
      total_students: allStudents.rows.length,
      missing: missing,
      submitted: submitted.length,
      in_progress: inProgress.length,
      not_started: missing.length
    });

  } catch (error) {
    console.error('Missing students error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// EDIT EXAM
const updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, subject_id, class_id, duration_minutes, pass_mark, start_at, end_at } = req.body;

    if (!title || !duration_minutes) {
      return res.status(400).json({ message: 'Title and duration are required' });
    }

    const result = await pool.query(
      `UPDATE exams SET 
        title=$1, type=$2, subject_id=$3, class_id=$4,
        duration_minutes=$5, pass_mark=$6, start_at=$7, end_at=$8
       WHERE id=$9 AND school_id=$10 AND created_by=$11
       RETURNING *`,
      [title, type, subject_id || null, class_id || null,
       duration_minutes, pass_mark || 50,
       start_at || null, end_at || null,
       id, req.user.school_id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found or unauthorized' });
    }

    const { logActivity } = require('./activity.controller');
    await logActivity({
      user_id: req.user.id,
      school_id: req.user.school_id,
      action: 'exam_updated',
      description: `Updated exam: ${title}`,
      metadata: { exam_id: id, title }
    });

    res.json({ message: 'Exam updated successfully', exam: result.rows[0] });

  } catch (error) {
    console.error('Update exam error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
const getGradingSessions = async (req, res) => {
  try {
    const { id } = req.params;
    const examRes = await pool.query(`SELECT * FROM exams WHERE id = $1`, [id]);
    if (examRes.rows.length === 0) return res.status(404).json({ message: 'Exam not found' });

    const sessions = await pool.query(`
      SELECT 
        es.id AS session_id,
        u.first_name || ' ' || u.last_name AS student_name,
        es.score, es.submitted_at,
        -- Check if all essay/short_answer questions are graded
        NOT EXISTS (
          SELECT 1 FROM exam_questions eq
          JOIN questions q ON eq.question_id = q.id
          LEFT JOIN responses r ON r.session_id = es.id AND r.question_id = q.id
          WHERE eq.exam_id = $1
          AND q.type IN ('essay', 'short_answer')
          AND (r.marks_awarded IS NULL)
        ) AS fully_graded
      FROM exam_sessions es
      JOIN users u ON es.student_id = u.id
      WHERE es.exam_id = $1 AND es.status = 'submitted'
      ORDER BY es.submitted_at DESC
    `, [id]);

    res.json({ exam: examRes.rows[0], sessions: sessions.rows });
  } catch (err) {
    console.error('getGradingSessions error:', err);
    res.status(500).json({ message: 'Failed to load grading sessions' });
  }
};

const getSessionAnswers = async (req, res) => {
  try {
    const { id, sessionId } = req.params;
    const answers = await pool.query(`
      SELECT
        q.id AS question_id, q.body, q.type, q.marks,
        r.text_answer AS student_answer,
        r.marks_awarded, r.feedback,
        (SELECT text FROM question_options WHERE question_id = q.id AND is_correct = true LIMIT 1) AS model_answer
      FROM exam_questions eq
      JOIN questions q ON eq.question_id = q.id
      LEFT JOIN responses r ON r.session_id = $2 AND r.question_id = q.id
      WHERE eq.exam_id = $1 AND q.type IN ('essay', 'short_answer')
      ORDER BY eq.order_num ASC
    `, [id, sessionId]);

    res.json({ answers: answers.rows });
  } catch (err) {
    console.error('getSessionAnswers error:', err);
    res.status(500).json({ message: 'Failed to load answers' });
  }
};

const saveGrade = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { question_id, marks_awarded, feedback } = req.body;

    // Update or insert response with grade
    await pool.query(`
      INSERT INTO responses (session_id, question_id, marks_awarded, feedback)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (session_id, question_id)
      DO UPDATE SET marks_awarded = $3, feedback = $4
    `, [sessionId, question_id, marks_awarded, feedback || null]);

    // Recalculate total score for session
    await pool.query(`
      UPDATE exam_sessions
      SET score = (
        SELECT COALESCE(SUM(r.marks_awarded), 0)
        FROM responses r WHERE r.session_id = $1
      )
      WHERE id = $1
    `, [sessionId]);

    res.json({ message: 'Grade saved successfully' });
  } catch (err) {
    console.error('saveGrade error:', err);
    res.status(500).json({ message: 'Failed to save grade' });
  }
};

module.exports = {
  createExam, getExams, getExam, updateExamStatus,
  deleteExam, getExamResults, getMissingStudents, updateExam,
  getGradingSessions, getSessionAnswers, saveGrade
};