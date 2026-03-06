const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { sanitizeInput, authLimiter } = require('./middleware/security.middleware');

const app = express();
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://portal-edu123.netlify.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize all inputs globally
app.use(sanitizeInput);

// Global rate limiter (production only)
if (process.env.NODE_ENV === 'production') {
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { message: 'Too many requests, please try again later' },
    validate: { xForwardedForHeader: false }
  });
  app.use(globalLimiter);
}

// Stricter rate limit on auth routes
app.use('/api/auth', authLimiter);

// Database connection + auto migration
require('./config/database');
require('./config/migrate');
const { createIndexes } = require('./config/indexes');
createIndexes().catch(err => console.warn('Index creation warning:', err.message));

// Routes
const routes = [
  ['/api/auth', './routes/auth.routes'],
  ['/api/exams', './routes/exam.routes'],
  ['/api/questions', './routes/question.routes'],
  ['/api/sessions', './routes/session.routes'],
  ['/api/admin', './routes/admin.routes'],
  ['/api/upload', './routes/upload.routes'],
  ['/api/leaderboard', './routes/leaderboard.routes'],
  ['/api/pdf', './routes/pdf.routes'],
  ['/api/parent', './routes/parent.routes'],
  ['/api/classes', './routes/class.routes'],
  ['/api/subjects', './routes/subject.routes'],
  ['/api/notifications', './routes/notification.routes'],
  ['/api/activity', './routes/activity.routes'],
];

routes.forEach(([path, route]) => {
  try {
    app.use(path, require(route));
    console.log(`✅ Loaded route: ${path}`);
  } catch (err) {
    console.error(`❌ Failed to load route ${path}:`, err.message);
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'CBT Platform API is running', status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS error: origin not allowed' });
  }
  res.status(500).json({ message: 'Internal server error' });
});

// Auto-scheduler for exams
const { runScheduler } = require('./services/scheduler.service');
setInterval(runScheduler, 60 * 1000);
runScheduler();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});