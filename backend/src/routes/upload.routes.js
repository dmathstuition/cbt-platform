const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/auth.middleware');
const { upload, bulkUploadStudents } = require('../controllers/upload.controller');

router.use(protect);

router.post(
  '/students',
  allowRoles('school_admin', 'super_admin'),
  upload.single('file'),
  bulkUploadStudents
);

module.exports = router;