const PDFDocument = require('pdfkit');
const pool = require('../config/database');

// Generate report card (student or admin)
const generateReportCard = async (req, res) => {
  try {
    const student_id = req.user.role === 'student'
      ? req.user.id
      : req.params.student_id;

    const studentRes = await pool.query(
      'SELECT first_name, last_name, email FROM users WHERE id=$1',
      [student_id]
    );
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const student = studentRes.rows[0];

    const schoolRes = await pool.query(
      'SELECT name FROM schools WHERE id=$1',
      [req.user.school_id]
    );
    const school = schoolRes.rows[0];

    const resultsRes = await pool.query(
      `SELECT 
        e.title, e.total_marks, e.pass_mark, e.type,
        es.score, es.submitted_at,
        ROUND((es.score / NULLIF(e.total_marks, 0)) * 100, 1) AS percentage,
        CASE WHEN es.score >= e.pass_mark THEN 'PASSED' ELSE 'FAILED' END AS status
       FROM exam_sessions es
       JOIN exams e ON es.exam_id = e.id
       WHERE es.student_id=$1 AND es.status='submitted'
       ORDER BY es.submitted_at DESC`,
      [student_id]
    );

    await buildReportCardPDF(res, student, school, resultsRes.rows);

  } catch (error) {
    console.error('PDF generation error:', error.message);
    res.status(500).json({ message: 'Failed to generate report card' });
  }
};

// Generate report card for parent (checks parent-student link)
const generateChildReportCard = async (req, res) => {
  try {
    const { student_id } = req.params;
    const parent_id = req.user.id;

    // Verify parent is linked to this student
    const linkCheck = await pool.query(
      'SELECT id FROM parent_student WHERE parent_id=$1 AND student_id=$2',
      [parent_id, student_id]
    );
    if (linkCheck.rows.length === 0) {
      return res.status(403).json({ message: 'You are not linked to this student' });
    }

    const studentRes = await pool.query(
      'SELECT first_name, last_name, email FROM users WHERE id=$1',
      [student_id]
    );
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const student = studentRes.rows[0];

    const schoolRes = await pool.query(
      'SELECT name FROM schools WHERE id=$1',
      [req.user.school_id]
    );
    const school = schoolRes.rows[0];

    const resultsRes = await pool.query(
      `SELECT 
        e.title, e.total_marks, e.pass_mark, e.type,
        es.score, es.submitted_at,
        ROUND((es.score / NULLIF(e.total_marks, 0)) * 100, 1) AS percentage,
        CASE WHEN es.score >= e.pass_mark THEN 'PASSED' ELSE 'FAILED' END AS status
       FROM exam_sessions es
       JOIN exams e ON es.exam_id = e.id
       WHERE es.student_id=$1 AND es.status='submitted'
       ORDER BY es.submitted_at DESC`,
      [student_id]
    );

    await buildReportCardPDF(res, student, school, resultsRes.rows);

  } catch (error) {
    console.error('Child PDF error:', error.message);
    res.status(500).json({ message: 'Failed to generate report card' });
  }
};

// Shared PDF builder
const buildReportCardPDF = async (res, student, school, results) => {
  const totalExams = results.length;
  const passed = results.filter(r => r.status === 'PASSED').length;
  const avgPercentage = totalExams > 0
    ? (results.reduce((sum, r) => sum + parseFloat(r.percentage || 0), 0) / totalExams).toFixed(1)
    : 0;

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename="report_card_${student.first_name}_${student.last_name}.pdf"`
  );

  doc.pipe(res);

  // Header
  doc.rect(0, 0, 595, 120).fill('#1E3A5F');
  doc.fillColor('white')
     .fontSize(22).font('Helvetica-Bold')
     .text(school?.name || 'CBT Platform', 50, 30, { align: 'center' });
  doc.fontSize(14).font('Helvetica')
     .text('STUDENT REPORT CARD', 50, 60, { align: 'center' });
  doc.fontSize(10)
     .text(`Generated: ${new Date().toLocaleDateString('en-GB', {
       day: 'numeric', month: 'long', year: 'numeric'
     })}`, 50, 85, { align: 'center' });

  // Student info
  doc.fillColor('#1E3A5F').fontSize(14).font('Helvetica-Bold')
     .text('STUDENT INFORMATION', 50, 140);
  doc.moveTo(50, 158).lineTo(545, 158).strokeColor('#1E3A5F').lineWidth(2).stroke();
  doc.fillColor('#333').fontSize(11).font('Helvetica')
     .text(`Name: ${student.first_name} ${student.last_name}`, 50, 168)
     .text(`Email: ${student.email}`, 50, 188)
     .text(`Total Exams Taken: ${totalExams}`, 300, 168)
     .text(`Average Score: ${avgPercentage}%`, 300, 188);

  // Summary boxes
  const boxY = 220;
  const boxData = [
    { label: 'Total Exams', value: totalExams, color: '#1E3A5F' },
    { label: 'Passed', value: passed, color: '#38A169' },
    { label: 'Failed', value: totalExams - passed, color: '#E53E3E' },
    { label: 'Average', value: `${avgPercentage}%`, color: '#D69E2E' }
  ];

  boxData.forEach((box, i) => {
    const x = 50 + (i * 125);
    doc.rect(x, boxY, 115, 60).fillAndStroke(box.color, box.color);
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
       .text(String(box.value), x, boxY + 10, { width: 115, align: 'center' });
    doc.fontSize(9).font('Helvetica')
       .text(box.label, x, boxY + 38, { width: 115, align: 'center' });
  });

  // Results table
  doc.fillColor('#1E3A5F').fontSize(14).font('Helvetica-Bold')
     .text('EXAM RESULTS', 50, 305);
  doc.moveTo(50, 323).lineTo(545, 323).strokeColor('#1E3A5F').lineWidth(2).stroke();

  const tableY = 333;
  doc.rect(50, tableY, 495, 25).fill('#1E3A5F');
  doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
     .text('EXAM TITLE', 58, tableY + 8)
     .text('SCORE', 300, tableY + 8)
     .text('PERCENTAGE', 370, tableY + 8)
     .text('STATUS', 460, tableY + 8);

  let rowY = tableY + 25;
  results.forEach((result, i) => {
    const bgColor = i % 2 === 0 ? '#F7FAFC' : 'white';
    doc.rect(50, rowY, 495, 28).fill(bgColor);
    const statusColor = result.status === 'PASSED' ? '#38A169' : '#E53E3E';
    const dateStr = result.submitted_at
      ? new Date(result.submitted_at).toLocaleDateString('en-GB') : 'N/A';

    doc.fillColor('#333').fontSize(9).font('Helvetica')
       .text(`${result.title} (${dateStr})`, 58, rowY + 10, { width: 230 })
       .text(`${result.score}/${result.total_marks}`, 300, rowY + 10)
       .text(`${result.percentage}%`, 370, rowY + 10);
    doc.fillColor(statusColor).font('Helvetica-Bold')
       .text(result.status, 460, rowY + 10);

    rowY += 28;
  });

  if (results.length === 0) {
    doc.fillColor('#999').fontSize(11).font('Helvetica')
       .text('No exam results found.', 50, rowY + 10, { align: 'center' });
  }

  const footerY = rowY + 30;
  doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#DDD').lineWidth(1).stroke();
  doc.fillColor('#999').fontSize(9).font('Helvetica')
     .text('This report card was automatically generated by CBT Platform.',
       50, footerY + 10, { align: 'center' });

  doc.end();
};

// Generate exam results PDF (teacher)
const generateExamResultsPDF = async (req, res) => {
  try {
    const { exam_id } = req.params;

    const examRes = await pool.query('SELECT * FROM exams WHERE id=$1', [exam_id]);
    if (examRes.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    const exam = examRes.rows[0];

    const schoolRes = await pool.query('SELECT name FROM schools WHERE id=$1', [req.user.school_id]);
    const school = schoolRes.rows[0];

    const resultsRes = await pool.query(
      `SELECT 
        u.first_name || ' ' || u.last_name AS student_name,
        u.email, es.score, es.submitted_at,
        ROUND((es.score / NULLIF(e.total_marks, 0)) * 100, 1) AS percentage,
        CASE WHEN es.score >= e.pass_mark THEN 'PASSED' ELSE 'FAILED' END AS status
       FROM exam_sessions es
       JOIN users u ON es.student_id = u.id
       JOIN exams e ON es.exam_id = e.id
       WHERE es.exam_id=$1 AND es.status='submitted'
       ORDER BY es.score DESC`,
      [exam_id]
    );

    const results = resultsRes.rows;
    const passed = results.filter(r => r.status === 'PASSED').length;
    const avg = results.length > 0
      ? (results.reduce((s, r) => s + parseFloat(r.percentage || 0), 0) / results.length).toFixed(1)
      : 0;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="exam_results_${exam_id}.pdf"`);
    doc.pipe(res);

    doc.rect(0, 0, 595, 120).fill('#1E3A5F');
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
       .text(school?.name || 'CBT Platform', 50, 25, { align: 'center' });
    doc.fontSize(14).font('Helvetica')
       .text(`EXAM RESULTS: ${exam.title}`, 50, 55, { align: 'center' });
    doc.fontSize(10)
       .text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 50, 82, { align: 'center' });

    const statsY = 140;
    const statsData = [
      { label: 'Total Students', value: results.length, color: '#1E3A5F' },
      { label: 'Passed', value: passed, color: '#38A169' },
      { label: 'Failed', value: results.length - passed, color: '#E53E3E' },
      { label: 'Average', value: `${avg}%`, color: '#D69E2E' }
    ];
    statsData.forEach((s, i) => {
      const x = 50 + (i * 125);
      doc.rect(x, statsY, 115, 55).fillAndStroke(s.color, s.color);
      doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
         .text(String(s.value), x, statsY + 8, { width: 115, align: 'center' });
      doc.fontSize(9).font('Helvetica')
         .text(s.label, x, statsY + 34, { width: 115, align: 'center' });
    });

    const tableY = 220;
    doc.rect(50, tableY, 495, 25).fill('#1E3A5F');
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
       .text('#', 58, tableY + 8)
       .text('STUDENT NAME', 80, tableY + 8)
       .text('SCORE', 310, tableY + 8)
       .text('PERCENTAGE', 370, tableY + 8)
       .text('STATUS', 460, tableY + 8);

    let rowY = tableY + 25;
    results.forEach((r, i) => {
      doc.rect(50, rowY, 495, 25).fill(i % 2 === 0 ? '#F7FAFC' : 'white');
      const statusColor = r.status === 'PASSED' ? '#38A169' : '#E53E3E';
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      doc.fillColor('#333').fontSize(9).font('Helvetica')
         .text(medal, 58, rowY + 8)
         .text(r.student_name, 80, rowY + 8, { width: 220 })
         .text(`${r.score}/${exam.total_marks}`, 310, rowY + 8)
         .text(`${r.percentage}%`, 370, rowY + 8);
      doc.fillColor(statusColor).font('Helvetica-Bold')
         .text(r.status, 460, rowY + 8);
      rowY += 25;
    });

    doc.end();

  } catch (error) {
    console.error('Exam PDF error:', error.message);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
};

// PRINT EXAM QUESTIONS AS PDF (Teacher)
const generateExamQuestionsPDF = async (req, res) => {
  try {
    const { exam_id } = req.params;

    const examRes = await pool.query(
      'SELECT * FROM exams WHERE id=$1 AND school_id=$2',
      [exam_id, req.user.school_id]
    );
    if (examRes.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    const exam = examRes.rows[0];

    const schoolRes = await pool.query(
      'SELECT * FROM schools WHERE id=$1',
      [req.user.school_id]
    );
    const school = schoolRes.rows[0];

    const questionsRes = await pool.query(
      `SELECT q.* FROM questions q
       JOIN exam_questions eq ON q.id = eq.question_id
       WHERE eq.exam_id = $1
       ORDER BY eq.created_at ASC`,
      [exam_id]
    );
    const questions = questionsRes.rows;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="exam_questions_${exam_id}.pdf"`
    );
    doc.pipe(res);

    // Header
    doc.rect(0, 0, 595, 110).fill('#1E3A5F');
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
       .text(school?.name || 'CBT Platform', 50, 20, { align: 'center' });
    doc.fontSize(13).font('Helvetica')
       .text(exam.title, 50, 48, { align: 'center' });
    doc.fontSize(10)
       .text(
         `Duration: ${exam.duration_minutes} mins  |  Total Marks: ${exam.total_marks}  |  Pass Mark: ${exam.pass_mark}`,
         50, 70, { align: 'center' }
       );
    doc.fontSize(9)
       .text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
         50, 88, { align: 'center' });

    // Student info line
    doc.fillColor('#333').fontSize(11).font('Helvetica')
       .text('Name: ________________________________    Class: ________________    Date: ____________',
         50, 128);
    doc.moveTo(50, 148).lineTo(545, 148).strokeColor('#DDD').lineWidth(1).stroke();

    // Questions
    let y = 162;
    const pageHeight = 750;

    questions.forEach((q, i) => {
      const options = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []);

      // Estimate height needed
      const optionLines = options.length * 20;
      const questionLines = Math.ceil(q.body.length / 80) * 16;
      const neededHeight = questionLines + optionLines + 50;

      // New page if needed
      if (y + neededHeight > pageHeight) {
        doc.addPage();
        y = 50;
      }

      // Question number box
      doc.rect(50, y, 24, 24).fill('#1E3A5F');
      doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
         .text(`${i + 1}`, 50, y + 6, { width: 24, align: 'center' });

      // Marks badge
      doc.fillColor('#666').fontSize(9).font('Helvetica')
         .text(`[${q.marks} mark${q.marks > 1 ? 's' : ''}]`, 490, y + 7);

      // Question body
      doc.fillColor('#1E3A5F').fontSize(11).font('Helvetica-Bold')
         .text(q.body, 82, y + 6, { width: 395 });

      y += Math.max(30, questionLines + 10);

      // Options
      if (q.type === 'mcq' || q.type === 'true_false') {
        const letters = ['A', 'B', 'C', 'D', 'E'];
        options.forEach((opt, oi) => {
          if (y > pageHeight) { doc.addPage(); y = 50; }

          // Circle for answer
          doc.circle(65, y + 5, 6).stroke('#999');
          doc.fillColor('#333').fontSize(10).font('Helvetica')
             .text(`${letters[oi]}.  ${opt.text}`, 78, y, { width: 420 });
          y += 20;
        });
      } else if (q.type === 'fill_blank') {
        doc.fillColor('#999').fontSize(10).font('Helvetica')
           .text('Answer: _______________________________________________', 82, y);
        y += 22;
      }

      y += 16; // gap between questions

      // Divider
      if (i < questions.length - 1) {
        doc.moveTo(50, y - 8).lineTo(545, y - 8)
           .strokeColor('#EEE').lineWidth(0.5).stroke();
      }
    });

    if (questions.length === 0) {
      doc.fillColor('#999').fontSize(12).font('Helvetica')
         .text('No questions added to this exam yet.', 50, 180, { align: 'center' });
    }

    // Footer on last page
    doc.fillColor('#999').fontSize(8).font('Helvetica')
       .text('— End of Exam —', 50, y + 20, { align: 'center', width: 495 });

    doc.end();

  } catch (error) {
    console.error('Exam questions PDF error:', error.message);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
};

module.exports = {
  generateReportCard,
  generateChildReportCard,
  generateExamResultsPDF,
  generateExamQuestionsPDF
};