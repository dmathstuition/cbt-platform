const pool = require('../config/database');

// Log an activity (used internally)
const logActivity = async ({ user_id, school_id, action, description, metadata = {} }) => {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, school_id, action, description, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, school_id, action, description, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error('Log activity error:', error.message);
  }
};

// GET MY RECENT ACTIVITY
const getMyActivity = async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const result = await pool.query(
      `SELECT * FROM activity_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    );
    res.json({ activities: result.rows });
  } catch (error) {
    console.error('Get activity error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET SCHOOL ACTIVITY (Admin)
const getSchoolActivity = async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const result = await pool.query(
      `SELECT a.*, u.first_name || ' ' || u.last_name AS user_name, u.role
       FROM activity_logs a
       JOIN users u ON a.user_id = u.id
       WHERE a.school_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [req.user.school_id, limit]
    );
    res.json({ activities: result.rows });
  } catch (error) {
    console.error('Get school activity error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { logActivity, getMyActivity, getSchoolActivity };
 