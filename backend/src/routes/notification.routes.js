const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/auth.middleware');
const {
  getNotifications, markAsRead, markAllAsRead,
  deleteNotification, sendNotification
} = require('../controllers/notification.controller');

router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);
router.post('/send', allowRoles('school_admin', 'super_admin'), sendNotification);

module.exports = router;
 