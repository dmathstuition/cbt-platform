const pool = require('../config/database');

// GET ALL SUBJECTS
const getSubjects = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*,
        COUNT(DISTINCT cs.class_id) AS class_count,
        COUNT(DISTINCT ta.teacher_id) AS teacher_count
       FROM subjects s
       LEFT JOIN class_subjects cs ON cs.subject_id = s.id
       LEFT JOIN teacher_assignments ta ON ta.subject_id = s.id
       WHERE s.school_id = $1
       GROUP BY s.id
       ORDER BY s.name`,
      [req.user.school_id]
    );
    res.json({ subjects: result.rows });
  } catch (error) {
    console.error('Get subjects error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// CREATE SUBJECT
const createSubject = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Subject name is required' });

    const result = await pool.query(
      'INSERT INTO subjects (name, description, school_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || '', req.user.school_id]
    );
    res.status(201).json({ message: 'Subject created', subject: result.rows[0] });
  } catch (error) {
    console.error('Create subject error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE SUBJECT
const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const result = await pool.query(
      'UPDATE subjects SET name=$1, description=$2 WHERE id=$3 AND school_id=$4 RETURNING *',
      [name, description || '', id, req.user.school_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Subject not found' });
    res.json({ message: 'Subject updated', subject: result.rows[0] });
  } catch (error) {
    console.error('Update subject error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE SUBJECT
const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM subjects WHERE id=$1 AND school_id=$2', [id, req.user.school_id]);
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    console.error('Delete subject error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ASSIGN TEACHER TO SUBJECT + CLASS
const assignTeacher = async (req, res) => {
  try {
    const { teacher_id, subject_id, class_id } = req.body;
    if (!teacher_id || !subject_id || !class_id) {
      return res.status(400).json({ message: 'teacher_id, subject_id and class_id are required' });
    }

    await pool.query(
      `INSERT INTO teacher_assignments (teacher_id, subject_id, class_id, school_id)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [teacher_id, subject_id, class_id, req.user.school_id]
    );
    res.json({ message: 'Teacher assigned successfully' });
  } catch (error) {
    console.error('Assign teacher error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// REMOVE TEACHER ASSIGNMENT
const removeTeacherAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'DELETE FROM teacher_assignments WHERE id=$1 AND school_id=$2',
      [id, req.user.school_id]
    );
    res.json({ message: 'Assignment removed' });
  } catch (error) {
    console.error('Remove assignment error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET ALL TEACHER ASSIGNMENTS
const getTeacherAssignments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ta.id,
        u.first_name || ' ' || u.last_name AS teacher_name,
        u.email AS teacher_email,
        s.name AS subject_name,
        c.name AS class_name,
        ta.teacher_id, ta.subject_id, ta.class_id
       FROM teacher_assignments ta
       JOIN users u ON ta.teacher_id = u.id
       JOIN subjects s ON ta.subject_id = s.id
       JOIN classes c ON ta.class_id = c.id
       WHERE ta.school_id = $1
       ORDER BY u.first_name`,
      [req.user.school_id]
    );
    res.json({ assignments: result.rows });
  } catch (error) {
    console.error('Get assignments error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyAssignments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ta.id, s.name AS subject_name, c.name AS class_name,
              s.id AS subject_id, c.id AS class_id
       FROM teacher_assignments ta
       JOIN subjects s ON ta.subject_id = s.id
       JOIN classes c ON ta.class_id = c.id
       WHERE ta.teacher_id = $1 AND ta.school_id = $2`,
      [req.user.id, req.user.school_id]
    );
    res.json({ assignments: result.rows });
  } catch (error) {
    console.error('Get my assignments error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getSubjects, createSubject, updateSubject, deleteSubject,
  assignTeacher, removeTeacherAssignment, getTeacherAssignments, getMyAssignments
};