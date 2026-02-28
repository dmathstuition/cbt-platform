const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/auth.middleware');
const {
  linkStudent, getChildren,
  getChildResults, unlinkStudent, linkParentByAdmin
} = require('../controllers/parent.controller');

router.use(protect);
router.use(allowRoles('parent'));
router.post('/link-by-admin', allowRoles('school_admin', 'super_admin'), linkParentByAdmin);
router.get('/children', getChildren);
router.post('/link', linkStudent);
router.get('/child/:student_id/results', getChildResults);
router.delete('/unlink/:student_id', unlinkStudent);

module.exports = router;