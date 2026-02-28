const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/auth.middleware');
const {
  createExam, getExams, getExam,
  updateExamStatus, deleteExam, getExamResults,
  getMissingStudents
} = require('../controllers/exam.controller');

router.use(protect);

router.post('/', allowRoles('teacher', 'school_admin', 'super_admin'), createExam);
router.get('/', getExams);
router.get('/:id', getExam);
router.patch('/:id/status', allowRoles('teacher', 'school_admin'), updateExamStatus);
router.delete('/:id', allowRoles('teacher', 'school_admin', 'super_admin'), deleteExam);
router.get('/:id/results', allowRoles('teacher', 'school_admin'), getExamResults);
router.get('/:id/missing-students', allowRoles('teacher', 'school_admin'), getMissingStudents);

module.exports = router;
