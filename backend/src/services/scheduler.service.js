const pool = require('../config/database');
const { createNotification } = require('../controllers/notification.controller');

async function notifyStudentsOfExam(exam, type) {
  try {
    let title, message;

    if (type === 'started') {
      title = `📝 Exam Started: ${exam.title}`;
      message = `Your exam "${exam.title}" is now live! Log in and start immediately.`;
    } else if (type === 'reminder') {
      title = `⏰ Exam Reminder: ${exam.title}`;
      message = `Your exam "${exam.title}" starts in 30 minutes. Get ready!`;
    } else if (type === 'ending_soon') {
      title = `⚠️ Exam Ending Soon: ${exam.title}`;
      message = `"${exam.title}" ends in 30 minutes. Submit before it closes!`;
    } else if (type === 'completed') {
      title = `✅ Exam Closed: ${exam.title}`;
      message = `"${exam.title}" has ended. Check your results in the Results tab.`;
    }

    // Get students eligible for this exam
    let students;
    if (exam.class_id) {
      students = await pool.query(
        `SELECT DISTINCT u.id FROM users u
         WHERE u.school_id = $1 AND u.role = 'student'
         AND u.is_active = true AND u.approval_status = 'approved'
         AND u.class_id = $2`,
        [exam.school_id, exam.class_id]
      );
    } else {
      students = await pool.query(
        `SELECT DISTINCT u.id FROM users u
         WHERE u.school_id = $1 AND u.role = 'student'
         AND u.is_active = true AND u.approval_status = 'approved'`,
        [exam.school_id]
      );
    }

    for (const student of students.rows) {
      await createNotification({
        user_id: student.id,
        school_id: exam.school_id,
        title,
        message,
        type: type === 'reminder' || type === 'ending_soon' ? 'warning' : 'info'
      });
    }

    console.log(`📬 Notified ${students.rows.length} student(s) — ${type}: ${exam.title}`);
  } catch (err) {
    console.error('Notify students error:', err.message);
  }
}

async function runScheduler() {
  try {
    const now = new Date().toISOString();
    const in30 = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // 1. Activate scheduled exams
    const activated = await pool.query(
      `UPDATE exams
       SET status = 'active'
       WHERE status = 'scheduled'
       AND start_at IS NOT NULL
       AND start_at <= $1
       RETURNING id, title, school_id, class_id`,
      [now]
    );
    for (const exam of activated.rows) {
      console.log(`✅ Auto-activated: ${exam.title}`);
      await notifyStudentsOfExam(exam, 'started');
    }

    // 2. Complete active exams past end_at
    const completed = await pool.query(
      `UPDATE exams
       SET status = 'completed'
       WHERE status = 'active'
       AND end_at IS NOT NULL
       AND end_at <= $1
       RETURNING id, title, school_id, class_id`,
      [now]
    );
    for (const exam of completed.rows) {
      console.log(`⏹ Auto-completed: ${exam.title}`);
      await notifyStudentsOfExam(exam, 'completed');
    }

    // 3. Send 30-min START reminders (scheduled exams starting soon)
    const startingSoon = await pool.query(
      `SELECT id, title, school_id, class_id FROM exams
       WHERE status = 'scheduled'
       AND start_at IS NOT NULL
       AND start_at BETWEEN $1 AND $2
       AND id NOT IN (
         SELECT DISTINCT n.metadata->>'exam_id'
         FROM notifications n
         WHERE n.type = 'warning'
         AND n.title LIKE '%Reminder%'
         AND n.created_at > NOW() - INTERVAL '35 minutes'
       )`,
      [now, in30]
    );
    for (const exam of startingSoon.rows) {
      console.log(`⏰ Sending start reminder: ${exam.title}`);
      await notifyStudentsOfExam(exam, 'reminder');
    }

    // 4. Send 30-min END warnings (active exams ending soon)
    const endingSoon = await pool.query(
      `SELECT id, title, school_id, class_id FROM exams
       WHERE status = 'active'
       AND end_at IS NOT NULL
       AND end_at BETWEEN $1 AND $2
       AND id NOT IN (
         SELECT DISTINCT n.metadata->>'exam_id'
         FROM notifications n
         WHERE n.type = 'warning'
         AND n.title LIKE '%Ending Soon%'
         AND n.created_at > NOW() - INTERVAL '35 minutes'
       )`,
      [now, in30]
    );
    for (const exam of endingSoon.rows) {
      console.log(`⚠️ Sending end warning: ${exam.title}`);
      await notifyStudentsOfExam(exam, 'ending_soon');
    }

  } catch (error) {
    console.error('Scheduler error:', error.message);
  }
}

module.exports = { runScheduler };