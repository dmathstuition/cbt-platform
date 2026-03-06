const rateLimit = require('express-rate-limit');

// In-memory store for failed login attempts
const loginAttempts = new Map();

const LOGIN_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const WINDOW_DURATION = 15 * 60 * 1000;

// Strict rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many requests from this IP. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

// Very strict limiter for login specifically
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

// Track failed login attempts per email+school combo
const trackFailedLogin = (key) => {
  const now = Date.now();
  const record = loginAttempts.get(key) || { attempts: 0, firstAttempt: now, lockedUntil: null };

  // Reset if window expired
  if (now - record.firstAttempt > WINDOW_DURATION) {
    record.attempts = 0;
    record.firstAttempt = now;
    record.lockedUntil = null;
  }

  record.attempts += 1;

  if (record.attempts >= LOGIN_MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION;
  }

  loginAttempts.set(key, record);
  return record;
};

const resetLoginAttempts = (key) => {
  loginAttempts.delete(key);
};

const isLockedOut = (key) => {
  const record = loginAttempts.get(key);
  if (!record || !record.lockedUntil) return false;
  if (Date.now() > record.lockedUntil) {
    loginAttempts.delete(key);
    return false;
  }
  return true;
};

const getRemainingLockout = (key) => {
  const record = loginAttempts.get(key);
  if (!record || !record.lockedUntil) return 0;
  return Math.ceil((record.lockedUntil - Date.now()) / 1000 / 60);
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Trim whitespace, remove null bytes
        clean[key] = value.trim().replace(/\0/g, '');
      } else if (typeof value === 'object' && value !== null) {
        clean[key] = sanitize(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  next();
};

// Validate password strength
const validatePassword = (password) => {
  const errors = [];
  if (!password || password.length < 8) errors.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('one uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('one number');
  return errors;
};

// Validate email format
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Clean expired lockouts periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    if (record.lockedUntil && now > record.lockedUntil) {
      loginAttempts.delete(key);
    }
    if (now - record.firstAttempt > WINDOW_DURATION * 2) {
      loginAttempts.delete(key);
    }
  }
}, 10 * 60 * 1000);

module.exports = {
  authLimiter,
  loginLimiter,
  sanitizeInput,
  trackFailedLogin,
  resetLoginAttempts,
  isLockedOut,
  getRemainingLockout,
  validatePassword,
  validateEmail
};