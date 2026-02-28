const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/auth.middleware');
const { getMyActivity, getSchoolActivity } = require('../controllers/activity.controller');

router.use(protect);

router.get('/my', getMyActivity);
router.get('/school', allowRoles('school_admin', 'super_admin'), getSchoolActivity);

module.exports = router;