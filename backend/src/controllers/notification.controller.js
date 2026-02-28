const pool = require('../config/database');

// GET MY NOTIFICATIONS
const getNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    const unread = result.rows.filter(n => !n.is_read).length;
    res.json({ notifications: result.rows, unread_count: unread });
  } catch (error) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// MARK ONE AS READ
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark read error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// MARK ALL AS READ
const markAllAsRead = async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read=true WHERE user_id=$1',
      [req.user.id]
    );
    res.json({ message: 'All marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE ONE NOTIFICATION
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'DELETE FROM notifications WHERE id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// SEND NOTIFICATION TO ROLES (Admin only)
const sendNotification = async (req, res) => {
  try {
    const { title, message, type, roles } = req.body;

    if (!title || !message || !roles || roles.length === 0) {
      return res.status(400).json({ message: 'title, message and roles are required' });
    }

    // Get all users with specified roles in this school
    const users = await pool.query(
      `SELECT id FROM users
       WHERE school_id=$1 AND role = ANY($2::text[])
       AND is_active=true AND approval_status='approved'`,
      [req.user.school_id, roles]
    );

    if (users.rows.length === 0) {
      return res.status(404).json({ message: 'No users found for selected roles' });
    }

    // Insert notification for each user
    for (const user of users.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, school_id, title, message, type)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, req.user.school_id, title, message, type || 'info']
      );
    }

    res.json({
      message: `Notification sent to ${users.rows.length} user(s)`,
      count: users.rows.length
    });
  } catch (error) {
    console.error('Send notification error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// HELPER — create a single notification (used internally)
const createNotification = async ({ user_id, school_id, title, message, type = 'info' }) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, school_id, title, message, type)
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, school_id, title, message, type]
    );
  } catch (error) {
    console.error('Create notification error:', error.message);
  }
};

module.exports = {
  getNotifications, markAsRead, markAllAsRead,
  deleteNotification, sendNotification, createNotification
};
 