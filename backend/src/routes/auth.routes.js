const express = require('express');
const router = express.Router();
const { register, login, changePassword } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/change-password', protect, changePassword);

module.exports = router;