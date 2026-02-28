const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/auth.middleware');
const { startExam, saveAnswer, submitExam, getMyResults, getExamReview } = require('../controllers/session.controller');
 
router.use(protect);

router.post('/start', allowRoles('student'), startExam);
router.post('/answer', allowRoles('student'), saveAnswer);
router.post('/submit', allowRoles('student'), submitExam);
router.get('/my-results', allowRoles('student'), getMyResults);
router.get('/:session_id/review', protect, getExamReview);
module.exports = router;