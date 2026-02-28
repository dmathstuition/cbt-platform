const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later',
    validate: { xForwardedForHeader: false }
  });
  app.use(limiter);
}

// Database connection + auto migration
require('./config/database');
require('./config/migrate');

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/exams', require('./routes/exam.routes'));
app.use('/api/questions', require('./routes/question.routes'));
app.use('/api/sessions', require('./routes/session.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/upload', require('./routes/upload.routes'));
app.use('/api/leaderboard', require('./routes/leaderboard.routes'));
app.use('/api/pdf', require('./routes/pdf.routes'));
app.use('/api/parent', require('./routes/parent.routes'));
app.use('/api/classes', require('./routes/class.routes'));
app.use('/api/subjects', require('./routes/subject.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/activity', require('./routes/activity.routes'));
// Test route
app.get('/', (req, res) => {
  res.json({ message: 'CBT Platform API is running' });
});

// Auto-scheduler for exams
const { runScheduler } = require('./services/scheduler.service');
setInterval(runScheduler, 60 * 1000);
runScheduler();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
 