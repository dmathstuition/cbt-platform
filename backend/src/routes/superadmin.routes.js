const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/auth.middleware');
const {
  getAllSchools, getSchool, createSchool,
  toggleSchoolStatus, updateSchool,
  getPlatformStats, deleteSchool
} = require('../controllers/superadmin.controller');

router.use(protect);
router.use(allowRoles('super_admin'));

router.get('/stats', getPlatformStats);
router.get('/schools', getAllSchools);
router.post('/schools', createSchool);
router.get('/schools/:id', getSchool);
router.put('/schools/:id', updateSchool);
router.patch('/schools/:id/toggle', toggleSchoolStatus);
router.delete('/schools/:id', deleteSchool);

module.exports = router;