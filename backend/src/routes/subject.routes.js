const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/auth.middleware');
const {
  getSubjects, createSubject, updateSubject, deleteSubject,
  assignTeacher, removeTeacherAssignment, getTeacherAssignments,
  getMyAssignments
} = require('../controllers/subject.controller');

router.use(protect);

router.get('/my-assignments', getMyAssignments);
router.get('/assignments', allowRoles('school_admin', 'super_admin'), getTeacherAssignments);
router.get('/', getSubjects);
router.post('/', allowRoles('school_admin', 'super_admin'), createSubject);
router.put('/:id', allowRoles('school_admin', 'super_admin'), updateSubject);
router.delete('/:id', allowRoles('school_admin', 'super_admin'), deleteSubject);
router.post('/assign-teacher', allowRoles('school_admin', 'super_admin'), assignTeacher);
router.delete('/assignments/:id', allowRoles('school_admin', 'super_admin'), removeTeacherAssignment);

module.exports = router;