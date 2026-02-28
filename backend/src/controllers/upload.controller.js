const pool = require('../config/database');
const bcrypt = require('bcrypt');
const csv = require('csv-parser');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

// Configure file upload storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

// BULK UPLOAD STUDENTS
const bulkUploadStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a CSV file' });
    }

    const results = [];
    const errors = [];
    const school_id = req.user.school_id;

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => results.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      return res.status(400).json({ message: 'CSV file is empty' });
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each row
    for (const row of results) {
      try {
        const first_name = row.first_name || row.firstName || row['First Name'];
        const last_name = row.last_name || row.lastName || row['Last Name'];
        const email = row.email || row.Email;
        const password = row.password || row.Password || 'password123';

        if (!first_name || !last_name || !email) {
          errors.push(`Row skipped — missing data: ${JSON.stringify(row)}`);
          errorCount++;
          continue;
        }

        // Check if student already exists
        const existing = await pool.query(
          'SELECT id FROM users WHERE email=$1 AND school_id=$2',
          [email, school_id]
        );

        if (existing.rows.length > 0) {
          errors.push(`${email} already exists — skipped`);
          errorCount++;
          continue;
        }

        const password_hash = await bcrypt.hash(password, 12);

        await pool.query(
          `INSERT INTO users (first_name, last_name, email, password_hash, role, school_id)
           VALUES ($1, $2, $3, $4, 'student', $5)`,
          [first_name, last_name, email, password_hash, school_id]
        );

        successCount++;

      } catch (rowError) {
        errors.push(`Error processing row: ${rowError.message}`);
        errorCount++;
      }
    }

    // Delete uploaded file after processing
    fs.unlinkSync(req.file.path);

    res.json({
      message: `Upload complete`,
      summary: {
        total: results.length,
        success: successCount,
        failed: errorCount
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk upload error:', error.message);
    res.status(500).json({ message: 'Server error during upload' });
  }
};

module.exports = { upload, bulkUploadStudents };