const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/auth.middleware');
const {
  getStats, getUsers, toggleUserStatus,
  deleteUser, getExamResults, createUser,
  getPendingUsers, approveUser, bulkApproveUsers, getSchoolSettings, updateSchoolSettings
} = require('../controllers/admin.controller');

router.use(protect);
router.use(allowRoles('school_admin', 'super_admin'));

router.get('/stats', getStats);
router.get('/users', getUsers);
router.post('/users', createUser);
router.patch('/users/:id/toggle', toggleUserStatus);
router.delete('/users/:id', deleteUser);
router.get('/results', getExamResults);
router.get('/pending', getPendingUsers);
router.patch('/users/:id/approve', approveUser);
router.post('/users/bulk-approve', bulkApproveUsers);
router.get('/school-settings', allowRoles('school_admin', 'super_admin'), getSchoolSettings);
router.put('/school-settings', allowRoles('school_admin', 'super_admin'), updateSchoolSettings);

module.exports = router;
 