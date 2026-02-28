const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/auth.middleware');
const {
  getClasses, createClass, updateClass, deleteClass,
  getClassStudents, assignSubjectToClass,
  removeSubjectFromClass, getClassSubjects
} = require('../controllers/class.controller');

router.use(protect);

router.get('/', getClasses);
router.post('/', allowRoles('school_admin', 'super_admin'), createClass);
router.put('/:id', allowRoles('school_admin', 'super_admin'), updateClass);
router.delete('/:id', allowRoles('school_admin', 'super_admin'), deleteClass);
router.get('/:id/students', getClassStudents);
router.get('/:id/subjects', getClassSubjects);
router.post('/assign-subject', allowRoles('school_admin', 'super_admin'), assignSubjectToClass);
router.post('/remove-subject', allowRoles('school_admin', 'super_admin'), removeSubjectFromClass);

module.exports = router;