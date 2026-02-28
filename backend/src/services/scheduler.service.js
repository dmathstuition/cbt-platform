const pool = require('../config/database');

async function runScheduler() {
  try {
    const now = new Date().toISOString();

    const activated = await pool.query(
      `UPDATE exams 
       SET status = 'active'
       WHERE status = 'scheduled' 
       AND start_at IS NOT NULL 
       AND start_at <= $1
       RETURNING title`,
      [now]
    );

    if (activated.rows.length > 0) {
      console.log(`✅ Auto-activated ${activated.rows.length} exam(s):`,
        activated.rows.map(e => e.title).join(', '));
    }

    const completed = await pool.query(
      `UPDATE exams 
       SET status = 'completed'
       WHERE status = 'active' 
       AND end_at IS NOT NULL 
       AND end_at <= $1
       RETURNING title`,
      [now]
    );

    if (completed.rows.length > 0) {
      console.log(`⏹ Auto-completed ${completed.rows.length} exam(s):`,
        completed.rows.map(e => e.title).join(', '));
    }

  } catch (error) {
    console.error('Scheduler error:', error.message);
  }
}

module.exports = { runScheduler };
 