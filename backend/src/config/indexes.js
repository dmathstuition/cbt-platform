const pool = require('./database');

const createIndexes = async () => {
  const indexes = [
    // Users - frequent lookups by email + school
    `CREATE INDEX IF NOT EXISTS idx_users_email_school ON users(email, school_id)`,
    `CREATE INDEX IF NOT EXISTS idx_users_school_role ON users(school_id, role)`,
    `CREATE INDEX IF NOT EXISTS idx_users_school_active ON users(school_id, is_active)`,

    // Exams - frequent lookups by school + status
    `CREATE INDEX IF NOT EXISTS idx_exams_school_id ON exams(school_id)`,
    `CREATE INDEX IF NOT EXISTS idx_exams_school_status ON exams(school_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by)`,
    `CREATE INDEX IF NOT EXISTS idx_exams_class_id ON exams(class_id)`,

    // Exam sessions - critical path for students
    `CREATE INDEX IF NOT EXISTS idx_sessions_student ON exam_sessions(student_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_exam ON exam_sessions(exam_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_exam_student ON exam_sessions(exam_id, student_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_status ON exam_sessions(status)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_submitted ON exam_sessions(submitted_at DESC)`,

    // Responses - heavy join target
    `CREATE INDEX IF NOT EXISTS idx_responses_session ON responses(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_responses_question ON responses(question_id)`,
    `CREATE INDEX IF NOT EXISTS idx_responses_session_question ON responses(session_id, question_id)`,

    // Questions
    `CREATE INDEX IF NOT EXISTS idx_questions_school ON questions(school_id)`,
    `CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type)`,
    `CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by)`,

    // Exam questions join table
    `CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id)`,
    `CREATE INDEX IF NOT EXISTS idx_exam_questions_question ON exam_questions(question_id)`,

    // Activity logs
    `CREATE INDEX IF NOT EXISTS idx_activity_school ON activity_logs(school_id)`,
    `CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC)`,

    // Notifications
    `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_school ON notifications(school_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read)`,

    // Parent-student links
    `CREATE INDEX IF NOT EXISTS idx_parent_student_parent ON parent_student(parent_id)`,
    `CREATE INDEX IF NOT EXISTS idx_parent_student_student ON parent_student(student_id)`,
  ];

  let created = 0;
  for (const sql of indexes) {
    try {
      await pool.query(sql);
      created++;
    } catch (err) {
      // Non-critical — log but continue
      console.warn(`Index warning: ${err.message}`);
    }
  }
  console.log(`✅ Database indexes: ${created}/${indexes.length} ready`);
};

module.exports = { createIndexes };