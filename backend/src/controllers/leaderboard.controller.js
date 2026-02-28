const pool = require('../config/database');

// OVERALL LEADERBOARD (with optional class filter)
const getOverallLeaderboard = async (req, res) => {
  try {
    const { class_id } = req.query;

    let query;
    let params;

    if (class_id) {
      query = `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name AS name,
          c.name AS class_name,
          COUNT(es.id) AS exams_taken,
          COUNT(CASE WHEN es.score >= e.pass_mark THEN 1 END) AS exams_passed,
          ROUND(AVG((es.score / NULLIF(e.total_marks, 0)) * 100), 1) AS avg_percentage,
          MAX(ROUND((es.score / NULLIF(e.total_marks, 0)) * 100, 1)) AS highest_score
         FROM users u
         JOIN exam_sessions es ON u.id = es.student_id
         JOIN exams e ON es.exam_id = e.id
         LEFT JOIN classes c ON u.class_id = c.id
         WHERE u.school_id = $1
         AND u.role = 'student'
         AND u.class_id = $2
         AND es.status = 'submitted'
         GROUP BY u.id, u.first_name, u.last_name, c.name
         HAVING COUNT(es.id) > 0
         ORDER BY avg_percentage DESC
         LIMIT 50`;
      params = [req.user.school_id, class_id];
    } else {
      query = `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name AS name,
          c.name AS class_name,
          COUNT(es.id) AS exams_taken,
          COUNT(CASE WHEN es.score >= e.pass_mark THEN 1 END) AS exams_passed,
          ROUND(AVG((es.score / NULLIF(e.total_marks, 0)) * 100), 1) AS avg_percentage,
          MAX(ROUND((es.score / NULLIF(e.total_marks, 0)) * 100, 1)) AS highest_score
         FROM users u
         JOIN exam_sessions es ON u.id = es.student_id
         JOIN exams e ON es.exam_id = e.id
         LEFT JOIN classes c ON u.class_id = c.id
         WHERE u.school_id = $1
         AND u.role = 'student'
         AND es.status = 'submitted'
         GROUP BY u.id, u.first_name, u.last_name, c.name
         HAVING COUNT(es.id) > 0
         ORDER BY avg_percentage DESC
         LIMIT 50`;
      params = [req.user.school_id];
    }

    const result = await pool.query(query, params);
    res.json({ leaderboard: result.rows });

  } catch (error) {
    console.error('Leaderboard error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// PER EXAM LEADERBOARD
const getExamLeaderboard = async (req, res) => {
  try {
    const { exam_id } = req.params;

    const examRes = await pool.query(
      'SELECT title, total_marks, pass_mark FROM exams WHERE id=$1 AND school_id=$2',
      [exam_id, req.user.school_id]
    );
    if (examRes.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const result = await pool.query(
      `SELECT 
        u.id,
        u.first_name || ' ' || u.last_name AS name,
        c.name AS class_name,
        es.score,
        e.total_marks,
        ROUND((es.score / NULLIF(e.total_marks, 0)) * 100, 1) AS percentage,
        CASE WHEN es.score >= e.pass_mark THEN true ELSE false END AS passed,
        es.submitted_at
       FROM exam_sessions es
       JOIN users u ON es.student_id = u.id
       JOIN exams e ON es.exam_id = e.id
       LEFT JOIN classes c ON u.class_id = c.id
       WHERE es.exam_id = $1 AND es.status = 'submitted'
       ORDER BY es.score DESC`,
      [exam_id]
    );

    res.json({ exam: examRes.rows[0], leaderboard: result.rows });

  } catch (error) {
    console.error('Exam leaderboard error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getOverallLeaderboard, getExamLeaderboard };
 