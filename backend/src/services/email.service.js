const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ===== RESULT EMAIL =====
const sendResultEmail = async ({ to, studentName, examTitle, score, totalMarks, percentage, passed, passedMark }) => {
  try {
    const subject = passed
      ? `🎉 Congratulations! You passed ${examTitle}`
      : `📝 Your results for ${examTitle}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #F0F4F8; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: #1E3A5F; padding: 32px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .header p { color: #93C5FD; margin: 8px 0 0; }
          .body { padding: 32px; }
          .result-box { background: #F7FAFC; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
          .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .result-item { text-align: center; }
          .result-value { font-size: 28px; font-weight: bold; color: #1E3A5F; }
          .result-label { color: #666; font-size: 13px; margin-top: 4px; }
          .badge { display: inline-block; padding: 8px 24px; border-radius: 20px; font-weight: bold; font-size: 16px; margin: 16px 0; }
          .passed { background: #C6F6D5; color: #276749; }
          .failed { background: #FED7D7; color: #9B2C2C; }
          .message { color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
          .footer { background: #F7FAFC; padding: 20px 32px; text-align: center; color: #888; font-size: 13px; border-top: 1px solid #EEE; }
          .btn { display: inline-block; background: #1E3A5F; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 CBT Platform</h1>
            <p>Exam Result Notification</p>
          </div>
          <div class="body">
            <p style="color:#333;font-size:16px;">Dear <strong>${studentName}</strong>,</p>
            <p class="message">Your exam <strong>${examTitle}</strong> has been graded. Here are your results:</p>
            <div class="result-box">
              <div class="result-grid">
                <div class="result-item">
                  <div class="result-value">${score}/${totalMarks}</div>
                  <div class="result-label">Score</div>
                </div>
                <div class="result-item">
                  <div class="result-value">${percentage}%</div>
                  <div class="result-label">Percentage</div>
                </div>
                <div class="result-item">
                  <div class="result-value">${passedMark}%</div>
                  <div class="result-label">Pass Mark</div>
                </div>
                <div class="result-item">
                  <div class="result-value">${passed ? '✅' : '❌'}</div>
                  <div class="result-label">Status</div>
                </div>
              </div>
              <div style="text-align:center;margin-top:16px;">
                <span class="badge ${passed ? 'passed' : 'failed'}">
                  ${passed ? '🎉 PASSED' : '❌ FAILED'}
                </span>
              </div>
            </div>
            <p class="message">
              ${passed
                ? 'Congratulations on passing! Keep up the excellent work.'
                : "Don't be discouraged. Review the material and try again. You can do it!"}
            </p>
            <div style="text-align:center;">
              <a href="http://localhost:3000/student/results" class="btn">View Full Results</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message from CBT Platform. Do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    console.log(`✅ Result email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Result email error:', error.message);
    return false;
  }
};

// ===== APPROVAL EMAIL =====
const sendApprovalEmail = async ({ to, studentName, action }) => {
  try {
    const approved = action === 'approve';
    const subject = approved
      ? '✅ Your CBT Platform account has been approved!'
      : '❌ Your CBT Platform registration was not approved';

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;background:#F0F4F8;margin:0;padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
          <div style="background:#1E3A5F;padding:32px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:24px;">📝 CBT Platform</h1>
            <p style="color:#93C5FD;margin:8px 0 0;">Account Registration Update</p>
          </div>
          <div style="padding:32px;">
            <p style="color:#333;font-size:16px;">Dear <strong>${studentName}</strong>,</p>

            ${approved ? `
              <div style="background:#F0FFF4;border-left:4px solid #38A169;padding:16px;border-radius:8px;margin:20px 0;">
                <h2 style="color:#276749;margin:0 0 8px;">🎉 Account Approved!</h2>
                <p style="color:#276749;margin:0;">
                  Your student account has been approved by your school administrator. 
                  You can now log in and access your exams.
                </p>
              </div>
              <div style="text-align:center;margin-top:24px;">
                <a href="http://localhost:3000/login" 
                   style="display:inline-block;background:#1E3A5F;color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
                  Login Now →
                </a>
              </div>
            ` : `
              <div style="background:#FFF5F5;border-left:4px solid #E53E3E;padding:16px;border-radius:8px;margin:20px 0;">
                <h2 style="color:#9B2C2C;margin:0 0 8px;">Registration Not Approved</h2>
                <p style="color:#9B2C2C;margin:0;">
                  Unfortunately your registration was not approved at this time. 
                  Please contact your school administrator for more information.
                </p>
              </div>
            `}

            <p style="color:#666;font-size:14px;margin-top:24px;">
              If you have any questions, please contact your school administrator.
            </p>
          </div>
          <div style="background:#F7FAFC;padding:20px 32px;text-align:center;color:#888;font-size:13px;border-top:1px solid #EEE;">
            <p>This is an automated message from CBT Platform. Do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    console.log(`✅ Approval email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Approval email error:', error.message);
    return false;
  }
};

// ===== REMINDER EMAIL =====
const sendExamReminderEmail = async ({ to, studentName, examTitle, startTime }) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: `⏰ Reminder: ${examTitle} starts soon`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
          <h2 style="color:#1E3A5F;">📝 Exam Reminder</h2>
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>This is a reminder that your exam <strong>${examTitle}</strong> 
             is scheduled to start at <strong>${startTime}</strong>.</p>
          <p>Make sure you are ready and in a quiet environment.</p>
          <a href="http://localhost:3000/student/dashboard"
             style="display:inline-block;background:#1E3A5F;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">
            Go to Dashboard
          </a>
          <p style="color:#888;font-size:13px;margin-top:24px;">CBT Platform — Automated Notification</p>
        </div>
      `
    });
    console.log(`✅ Reminder email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Reminder email error:', error.message);
    return false;
  }
};

// SEND LOGIN CREDENTIALS EMAIL
const sendCredentialsEmail = async ({ to, name, email, password, role, loginUrl }) => {
  try {
    const roleLabels = {
      student: '👨‍🎓 Student', teacher: '👨‍🏫 Teacher',
      parent: '👨‍👩‍👧 Parent', school_admin: '👑 School Admin'
    };
    const subject = `🎉 Your CBT Platform account is ready!`;
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;background:#F0F4F8;margin:0;padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
          <div style="background:#1E3A5F;padding:32px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:24px;">📝 CBT Platform</h1>
            <p style="color:#93C5FD;margin:8px 0 0;">Your account has been created</p>
          </div>
          <div style="padding:32px;">
            <p style="color:#333;font-size:16px;">Dear <strong>${name}</strong>,</p>
            <p style="color:#555;font-size:15px;line-height:1.6;">
              Your <strong>${roleLabels[role] || role}</strong> account has been created on CBT Platform. 
              Here are your login details:
            </p>
            <div style="background:#F7FAFC;border-radius:12px;padding:24px;margin:20px 0;border:1px solid #E2E8F0;">
              <div style="margin-bottom:16px;">
                <div style="color:#888;font-size:12px;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Email Address</div>
                <div style="color:#1E3A5F;font-size:18px;font-weight:700;">${email}</div>
              </div>
              <div>
                <div style="color:#888;font-size:12px;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Password</div>
                <div style="color:#1E3A5F;font-size:18px;font-weight:700;letter-spacing:2px;">${password}</div>
              </div>
            </div>
            <div style="background:#FFFBEB;border-left:4px solid #D69E2E;padding:12px;border-radius:4px;margin-bottom:24px;">
              <p style="color:#744210;font-size:13px;margin:0;">
                ⚠️ Please change your password after first login for security.
              </p>
            </div>
            <div style="text-align:center;">
              <a href="${loginUrl || 'http://localhost:3000/login'}"
                 style="display:inline-block;background:#1E3A5F;color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
                Login Now →
              </a>
            </div>
          </div>
          <div style="background:#F7FAFC;padding:20px 32px;text-align:center;color:#888;font-size:13px;border-top:1px solid #EEE;">
            <p>This is an automated message from CBT Platform. Do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    console.log(`✅ Credentials email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Credentials email error:', error.message);
    return false;
  }
};

module.exports = { sendResultEmail, sendApprovalEmail, sendExamReminderEmail, sendCredentialsEmail };