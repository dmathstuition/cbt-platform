const pool = require('../config/database');

// CREATE QUESTION
const createQuestion = async (req, res) => {
  try {
    const { type, body, options, marks, difficulty, subject_id } = req.body;

    if (!type || !body) {
      return res.status(400).json({ message: 'type and body are required' });
    }

    if (type === 'mcq' && (!options || options.length < 2)) {
      return res.status(400).json({ message: 'MCQ requires at least 2 options' });
    }

    const result = await pool.query(
      `INSERT INTO questions 
        (school_id, created_by, type, body, options, marks, difficulty, subject_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user.school_id,
        req.user.id,
        type,
        body,
        JSON.stringify(options || []),
        marks || 1,
        difficulty || 'medium',
        subject_id || null
      ]
    );

    res.status(201).json({ question: result.rows[0] });

  } catch (error) {
    console.error('Create question error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET ALL QUESTIONS (Question Bank)
const getQuestions = async (req, res) => {
  try {
    const { type, difficulty, search } = req.query;

    let query = `
      SELECT q.*, 
        u.first_name || ' ' || u.last_name AS created_by_name,
        COUNT(eq.exam_id) AS used_in_exams
       FROM questions q
       LEFT JOIN users u ON q.created_by = u.id
       LEFT JOIN exam_questions eq ON q.id = eq.question_id
       WHERE q.school_id = $1
    `;
    let params = [req.user.school_id];
    let paramCount = 2;

    if (type) {
      query += ` AND q.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (difficulty) {
      query += ` AND q.difficulty = $${paramCount}`;
      params.push(difficulty);
      paramCount++;
    }

    if (search) {
      query += ` AND q.body ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' GROUP BY q.id, u.first_name, u.last_name ORDER BY q.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ questions: result.rows });

  } catch (error) {
    console.error('Get questions error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ADD QUESTION TO EXAM
const addQuestionToExam = async (req, res) => {
  try {
    const { exam_id, question_id } = req.body;

    if (!exam_id || !question_id) {
      return res.status(400).json({ message: 'exam_id and question_id are required' });
    }

    // Check exam belongs to school
    const exam = await pool.query(
      'SELECT * FROM exams WHERE id=$1 AND school_id=$2',
      [exam_id, req.user.school_id]
    );
    if (exam.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check question belongs to school
    const question = await pool.query(
      'SELECT * FROM questions WHERE id=$1 AND school_id=$2',
      [question_id, req.user.school_id]
    );
    if (question.rows.length === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check not already added
    const existing = await pool.query(
      'SELECT id FROM exam_questions WHERE exam_id=$1 AND question_id=$2',
      [exam_id, question_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Question already in exam' });
    }

    // Add to exam
    await pool.query(
      'INSERT INTO exam_questions (exam_id, question_id) VALUES ($1, $2)',
      [exam_id, question_id]
    );

    // Update exam total marks
    await pool.query(
      'UPDATE exams SET total_marks = total_marks + $1 WHERE id=$2',
      [question.rows[0].marks, exam_id]
    );

    res.json({ message: 'Question added to exam successfully' });

  } catch (error) {
    console.error('Add question to exam error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE QUESTION
const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'DELETE FROM questions WHERE id=$1 AND school_id=$2',
      [id, req.user.school_id]
    );

    res.json({ message: 'Question deleted successfully' });

  } catch (error) {
    console.error('Delete question error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET QUESTIONS FOR A SPECIFIC EXAM
const getExamQuestions = async (req, res) => {
  try {
    const { exam_id } = req.params;

    const result = await pool.query(
      `SELECT q.* FROM questions q
       JOIN exam_questions eq ON q.id = eq.question_id
       WHERE eq.exam_id = $1 AND q.school_id = $2`,
      [exam_id, req.user.school_id]
    );

    res.json({ questions: result.rows });

  } catch (error) {
    console.error('Get exam questions error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// REMOVE QUESTION FROM EXAM
const removeQuestionFromExam = async (req, res) => {
  try {
    const { exam_id, question_id } = req.body;

    const question = await pool.query(
      'SELECT marks FROM questions WHERE id=$1',
      [question_id]
    );

    await pool.query(
      'DELETE FROM exam_questions WHERE exam_id=$1 AND question_id=$2',
      [exam_id, question_id]
    );

    if (question.rows.length > 0) {
      await pool.query(
        'UPDATE exams SET total_marks = GREATEST(0, total_marks - $1) WHERE id=$2',
        [question.rows[0].marks, exam_id]
      );
    }

    res.json({ message: 'Question removed from exam' });

  } catch (error) {
    console.error('Remove question error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// BULK UPLOAD QUESTIONS (CSV or JSON)
const bulkUploadQuestions = async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'questions array is required' });
    }

    const errors = [];
    const inserted = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const rowNum = i + 1;

      // Validate required fields
      if (!q.type || !q.body) {
        errors.push(`Row ${rowNum}: type and body are required`);
        continue;
      }
      if (!['mcq', 'true_false', 'fill_blank'].includes(q.type)) {
        errors.push(`Row ${rowNum}: type must be mcq, true_false or fill_blank`);
        continue;
      }
      if (q.type === 'mcq' && (!q.options || q.options.length < 2)) {
        errors.push(`Row ${rowNum}: MCQ requires at least 2 options`);
        continue;
      }

      try {
        const result = await pool.query(
          `INSERT INTO questions 
            (school_id, created_by, type, body, options, marks, difficulty, subject_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [
            req.user.school_id,
            req.user.id,
            q.type,
            q.body,
            JSON.stringify(q.options || []),
            q.marks || 1,
            q.difficulty || 'medium',
            q.subject_id || null
          ]
        );
        inserted.push(result.rows[0].id);
      } catch (err) {
        errors.push(`Row ${rowNum}: ${err.message}`);
      }
    }

    res.status(201).json({
      message: `${inserted.length} question(s) uploaded successfully`,
      inserted: inserted.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk upload error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createQuestion,
  getQuestions,
  addQuestionToExam,
  deleteQuestion,
  getExamQuestions,
  removeQuestionFromExam,
  bulkUploadQuestions
};