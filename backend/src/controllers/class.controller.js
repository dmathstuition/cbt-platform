const pool = require('../config/database');

// GET ALL CLASSES
const getClasses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
        COUNT(DISTINCT u.id) AS student_count,
        COUNT(DISTINCT cs.subject_id) AS subject_count
       FROM classes c
       LEFT JOIN users u ON u.class_id = c.id AND u.role = 'student'
       LEFT JOIN class_subjects cs ON cs.class_id = c.id
       WHERE c.school_id = $1
       GROUP BY c.id
       ORDER BY c.name`,
      [req.user.school_id]
    );
    res.json({ classes: result.rows });
  } catch (error) {
    console.error('Get classes error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// CREATE CLASS
const createClass = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Class name is required' });

    const result = await pool.query(
      'INSERT INTO classes (name, description, school_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || '', req.user.school_id]
    );
    res.status(201).json({ message: 'Class created', class: result.rows[0] });
  } catch (error) {
    console.error('Create class error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE CLASS
const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const result = await pool.query(
      'UPDATE classes SET name=$1, description=$2 WHERE id=$3 AND school_id=$4 RETURNING *',
      [name, description || '', id, req.user.school_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Class not found' });
    res.json({ message: 'Class updated', class: result.rows[0] });
  } catch (error) {
    console.error('Update class error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE CLASS
const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM classes WHERE id=$1 AND school_id=$2', [id, req.user.school_id]);
    res.json({ message: 'Class deleted' });
  } catch (error) {
    console.error('Delete class error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET STUDENTS IN A CLASS
const getClassStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.is_active
       FROM users u
       WHERE u.class_id = $1 AND u.school_id = $2 AND u.role = 'student'
       ORDER BY u.first_name`,
      [id, req.user.school_id]
    );
    res.json({ students: result.rows });
  } catch (error) {
    console.error('Get class students error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ASSIGN SUBJECT TO CLASS
const assignSubjectToClass = async (req, res) => {
  try {
    const { class_id, subject_id } = req.body;
    await pool.query(
      'INSERT INTO class_subjects (class_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [class_id, subject_id]
    );
    res.json({ message: 'Subject assigned to class' });
  } catch (error) {
    console.error('Assign subject error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// REMOVE SUBJECT FROM CLASS
const removeSubjectFromClass = async (req, res) => {
  try {
    const { class_id, subject_id } = req.body;
    await pool.query(
      'DELETE FROM class_subjects WHERE class_id=$1 AND subject_id=$2',
      [class_id, subject_id]
    );
    res.json({ message: 'Subject removed from class' });
  } catch (error) {
    console.error('Remove subject error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET SUBJECTS FOR A CLASS
const getClassSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.* FROM subjects s
       JOIN class_subjects cs ON s.id = cs.subject_id
       WHERE cs.class_id = $1`,
      [id]
    );
    res.json({ subjects: result.rows });
  } catch (error) {
    console.error('Get class subjects error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getClasses, createClass, updateClass, deleteClass,
  getClassStudents, assignSubjectToClass,
  removeSubjectFromClass, getClassSubjects
};