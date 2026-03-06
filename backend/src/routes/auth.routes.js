const express = require('express');
const router = express.Router();
const { register, login, changePassword, refreshToken } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { loginLimiter } = require('../middleware/security.middleware');

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshToken);
router.post('/change-password', protect, changePassword);

module.exports = router;