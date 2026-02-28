const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/auth.middleware');
const {
  generateReportCard,
  generateChildReportCard,
  generateExamResultsPDF,
  generateExamQuestionsPDF
} = require('../controllers/pdf.controller');

router.use(protect);

// Student downloads their own report card
router.get('/report-card', allowRoles('student'), generateReportCard);

// Admin downloads any student's report card
router.get('/report-card/:student_id',
  allowRoles('school_admin', 'super_admin'),
  generateReportCard
);

// Parent downloads their child's report card
router.get('/child-report/:student_id',
  allowRoles('parent'),
  generateChildReportCard
);

// Teacher/Admin downloads exam results PDF
router.get('/exam-results/:exam_id',
  allowRoles('teacher', 'school_admin', 'super_admin'),
  generateExamResultsPDF
);

// Teacher prints exam questions
router.get('/exam-questions/:exam_id',
  allowRoles('teacher', 'school_admin', 'super_admin'),
  generateExamQuestionsPDF
);

module.exports = router;