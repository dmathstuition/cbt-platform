const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getOverallLeaderboard, getExamLeaderboard } = require('../controllers/leaderboard.controller');

router.use(protect);

router.get('/overall', getOverallLeaderboard);
router.get('/exam/:exam_id', getExamLeaderboard);

module.exports = router;