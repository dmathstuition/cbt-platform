const pool = require('../config/database');
const { sendResultEmail } = require('../services/email.service');

// Helper: shuffle array (randomize questions per student)
function shuffleArray(array, seed) {
  const arr = [...array];
  let hash = 0;
  for (const char of seed) hash = ((hash << 5) - hash) + char.charCodeAt(0);
  for (let i = arr.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(hash) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// START EXAM SESSION
const startExam = async (req, res) => {
  try {
    const { exam_id } = req.body;
    const student_id = req.user.id;

    if (!exam_id) {
      return res.status(400).json({ message: 'exam_id is required' });
    }

    const exam = await pool.query(
      'SELECT * FROM exams WHERE id=$1 AND school_id=$2',
      [exam_id, req.user.school_id]
    );
    if (exam.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const examData = exam.rows[0];

    if (examData.status !== 'active') {
      return res.status(400).json({ message: 'Exam is not active yet' });
    }

  const existing = await pool.query(
      'SELECT id, status FROM exam_sessions WHERE exam_id=$1 AND student_id=$2',
      [exam_id, student_id]
    );
    if (existing.rows.length > 0) {
      const existingSession = existing.rows[0];

      // If already submitted, block
      if (existingSession.status === 'submitted') {
        return res.status(400).json({ message: 'You have already completed this exam' });
      }

      // If in_progress, delete old session and let them restart
      await pool.query('DELETE FROM responses WHERE session_id=$1', [existingSession.id]);
      await pool.query('DELETE FROM exam_sessions WHERE id=$1', [existingSession.id]);
    }
  

    const questions = await pool.query(
      `SELECT q.id, q.type, q.body, q.options, q.marks
       FROM questions q
       INNER JOIN exam_questions eq ON q.id = eq.question_id
       WHERE eq.exam_id = $1`,
      [exam_id]
    );

    if (questions.rows.length === 0) {
      return res.status(400).json({ message: 'Exam has no questions yet' });
    }

    const shuffled = shuffleArray(questions.rows, `${exam_id}:${student_id}`);

    const safeQuestions = shuffled.map(q => ({
      id: q.id,
      type: q.type,
      body: q.body,
      marks: q.marks,
      options: q.type === 'mcq'
        ? q.options.map(o => ({ id: o.id, text: o.text }))
        : q.options
    }));

    const session = await pool.query(
      `INSERT INTO exam_sessions 
        (exam_id, student_id, time_remaining_sec, status)
       VALUES ($1, $2, $3, 'in_progress')
       RETURNING *`,
      [exam_id, student_id, examData.duration_minutes * 60]
    );

    const { logActivity } = require('./activity.controller');
    await logActivity({
      user_id: student_id,
      school_id: req.user.school_id,
      action: 'exam_started',
      description: `Started exam: ${examData.title}`,
      metadata: { exam_id, exam_title: examData.title }
    });

    res.status(201).json({
      message: 'Exam started successfully',
      session_id: session.rows[0].id,
      time_remaining_sec: session.rows[0].time_remaining_sec,
      total_questions: safeQuestions.length,
      questions: safeQuestions
    });

  } catch (error) {
    console.error('Start exam error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// SAVE ANSWER
const saveAnswer = async (req, res) => {
  try {
    const { session_id, question_id, answer } = req.body;

    if (!session_id || !question_id || !answer) {
      return res.status(400).json({ message: 'session_id, question_id and answer are required' });
    }

    const session = await pool.query(
      'SELECT * FROM exam_sessions WHERE id=$1 AND student_id=$2',
      [session_id, req.user.id]
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.rows[0].status !== 'in_progress') {
      return res.status(400).json({ message: 'Exam already submitted' });
    }

     await pool.query(
      `INSERT INTO responses (session_id, question_id, answer)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (session_id, question_id)
       DO UPDATE SET answer=EXCLUDED.answer, answered_at=NOW()`,
      [session_id, question_id, JSON.stringify(answer)]
    );

    res.json({ message: 'Answer saved' });

  } catch (error) {
    console.error('Save answer error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// SUBMIT EXAM
const submitExam = async (req, res) => {
  try {
    const { session_id } = req.body;

    const session = await pool.query(
      'SELECT * FROM exam_sessions WHERE id=$1 AND student_id=$2',
      [session_id, req.user.id]
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.rows[0].status !== 'in_progress') {
      return res.status(400).json({ message: 'Exam already submitted' });
    }

    const responses = await pool.query(
      `SELECT r.id, r.answer, q.options, q.type, q.marks, r.question_id
       FROM responses r
       JOIN questions q ON r.question_id = q.id
       WHERE r.session_id = $1`,
      [session_id]
    );

    let totalScore = 0;
    for (const response of responses.rows) {
      let isCorrect = false;
      let marksAwarded = 0;

      if (response.type === 'mcq') {
        const correctOption = response.options.find(o => o.is_correct);
        const studentAnswer = response.answer?.selectedId;
        isCorrect = correctOption && studentAnswer === correctOption.id;
      } else if (response.type === 'true_false') {
        const correctOption = response.options.find(o => o.is_correct);
        isCorrect = response.answer?.selectedId === correctOption?.id;
      } else if (response.type === 'fill_blank') {
        const correctAnswer = response.options[0]?.text?.toLowerCase().trim();
        const studentAnswer = response.answer?.text?.toLowerCase().trim();
        isCorrect = studentAnswer === correctAnswer;
      }

      marksAwarded = isCorrect ? response.marks : 0;
      totalScore += marksAwarded;

      await pool.query(
        'UPDATE responses SET is_correct=$1, marks_awarded=$2 WHERE id=$3',
        [isCorrect, marksAwarded, response.id]
      );
    }

   const exam = await pool.query(
      'SELECT pass_mark, total_marks, title FROM exams WHERE id=$1',
      [session.rows[0].exam_id]
    );
 

    const examData = exam.rows[0];
    const percentage = examData.total_marks > 0
      ? ((totalScore / examData.total_marks) * 100).toFixed(2)
      : 0;
    const passed = percentage >= examData.pass_mark;

    await pool.query(
      `UPDATE exam_sessions 
       SET status='submitted', score=$1, submitted_at=NOW()
       WHERE id=$2`,
      [totalScore, session_id]
    );

    // Get student info and send email
    const student = await pool.query(
      'SELECT first_name, last_name, email FROM users WHERE id=$1',
      [req.user.id]
    );

    const studentData = student.rows[0];

    sendResultEmail({
      to: studentData.email,
      studentName: `${studentData.first_name} ${studentData.last_name}`,
      examTitle: examData.title,
      score: totalScore,
      totalMarks: examData.total_marks,
      percentage,
      passed,
      passedMark: examData.pass_mark
    });

    const { logActivity } = require('./activity.controller');
    await logActivity({
      user_id: req.user.id,
      school_id: req.user.school_id,
      action: 'exam_submitted',
      description: `Submitted exam — Score: ${totalScore}/${examData.total_marks} (${percentage}%) — ${passed ? 'PASSED' : 'FAILED'}`,
      metadata: { exam_title: examData.title, score: totalScore, percentage, passed }
    });

    res.json({
      message: 'Exam submitted successfully',
      result: {
        score: totalScore,
        total_marks: examData.total_marks,
        percentage,
        passed,
        pass_mark: examData.pass_mark
      }
    });

  } catch (error) {
    console.error('Submit exam error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET STUDENT RESULTS HISTORY
const getMyResults = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        es.id, es.score, es.status, es.started_at, es.submitted_at,
        e.title AS exam_title, e.total_marks, e.pass_mark,
        e.duration_minutes, e.type,
        CASE WHEN es.score >= e.pass_mark THEN true ELSE false END AS passed,
        ROUND((es.score / NULLIF(e.total_marks, 0)) * 100, 1) AS percentage
       FROM exam_sessions es
       JOIN exams e ON es.exam_id = e.id
       WHERE es.student_id = $1 AND es.status = 'submitted'
       ORDER BY es.submitted_at DESC`,
      [req.user.id]
    );

    res.json({ results: result.rows });

  } catch (error) {
    console.error('Get results error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET EXAM REVIEW
const getExamReview = async (req, res) => {
  try {
    const { session_id } = req.params;

    const session = await pool.query(
      'SELECT * FROM exam_sessions WHERE id=$1 AND student_id=$2 AND status=$3',
      [session_id, req.user.id, 'submitted']
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found or not submitted' });
    }

    const exam = await pool.query(
      'SELECT * FROM exams WHERE id=$1',
      [session.rows[0].exam_id]
    );

    const questions = await pool.query(
      `SELECT 
        q.id, q.type, q.body, q.options, q.marks,
        r.answer, r.is_correct, r.marks_awarded
       FROM questions q
       INNER JOIN exam_questions eq ON q.id = eq.question_id
       LEFT JOIN responses r ON r.question_id = q.id AND r.session_id = $1
       WHERE eq.exam_id = $2
       ORDER BY eq.created_at`,
      [session_id, session.rows[0].exam_id]
    );

    // Parse student answers
    const questionsWithAnswers = questions.rows.map(q => {
      let student_answer = null;
      if (q.answer) {
        const ans = q.answer;
        if (q.type === 'mcq' || q.type === 'true_false') {
          student_answer = ans?.selectedId || null;
        } else if (q.type === 'fill_blank') {
          student_answer = ans?.text || null;
        }
      }
      return { ...q, student_answer };
    });

    res.json({
      session: session.rows[0],
      exam: exam.rows[0],
      questions: questionsWithAnswers
    });

  } catch (error) {
    console.error('Get review error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { startExam, saveAnswer, submitExam, getMyResults, getExamReview };
 