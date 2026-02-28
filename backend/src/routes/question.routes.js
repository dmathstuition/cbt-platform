const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/auth.middleware');
const {
  createQuestion,
  getQuestions,
  addQuestionToExam,
  deleteQuestion,
  getExamQuestions,
  removeQuestionFromExam,
  bulkUploadQuestions
} = require('../controllers/question.controller');

router.use(protect);

router.get('/', allowRoles('teacher', 'school_admin'), getQuestions);
router.post('/', allowRoles('teacher', 'school_admin'), createQuestion);
router.post('/bulk-upload', allowRoles('teacher', 'school_admin'), bulkUploadQuestions);
router.post('/add-to-exam', allowRoles('teacher', 'school_admin'), addQuestionToExam);
router.post('/remove-from-exam', allowRoles('teacher', 'school_admin'), removeQuestionFromExam);
router.get('/exam/:exam_id', allowRoles('teacher', 'school_admin'), getExamQuestions);
router.delete('/:id', allowRoles('teacher', 'school_admin'), deleteQuestion);

module.exports = router;