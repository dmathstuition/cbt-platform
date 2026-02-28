import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { classAPI, subjectAPI } from '../../services/api';

function ManageClasses() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editClass, setEditClass] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        classAPI.getAll(),
        subjectAPI.getAll()
      ]);
      setClasses(cRes.data.classes);
      setSubjects(sRes.data.subjects);
    } catch (err) {
      console.error('Failed to load');
    }
    setLoading(false);
  };

  const handleSelectClass = async (cls) => {
    setSelectedClass(cls);
    setClassStudents([]);
    setClassSubjects([]);
    try {
      const [studRes, subRes] = await Promise.all([
        classAPI.getStudents(cls.id),
        classAPI.getSubjects(cls.id)
      ]);
      setClassStudents(studRes.data.students);
      setClassSubjects(subRes.data.subjects);
    } catch (err) {
      console.error('Failed to load class details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editClass) {
        await classAPI.update(editClass.id, form);
        setSuccess('Class updated!');
      } else {
        await classAPI.create(form);
        setSuccess('Class created!');
      }
      setForm({ name: '', description: '' });
      setEditClass(null);
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save class');
    }
  };

  const handleEdit = (cls) => {
    setEditClass(cls);
    setForm({ name: cls.name, description: cls.description || '' });
    setShowForm(true);
    setSelectedClass(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this class?')) return;
    try {
      await classAPI.delete(id);
      setSuccess('Class deleted');
      if (selectedClass?.id === id) setSelectedClass(null);
      loadData();
    } catch (err) {
      setError('Failed to delete class');
    }
  };

  const handleAssignSubject = async (subject_id) => {
    if (!subject_id) return;
    setError('');
    setSuccess('');
    try {
      await classAPI.assignSubject({ class_id: selectedClass.id, subject_id });
      setSuccess('Subject assigned!');
      handleSelectClass(selectedClass);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign subject');
    }
  };

  const handleRemoveSubject = async (subject_id) => {
    try {
      await classAPI.removeSubject({ class_id: selectedClass.id, subject_id });
      setSuccess('Subject removed');
      handleSelectClass(selectedClass);
      loadData();
    } catch (err) {
      setError('Failed to remove subject');
    }
  };

  const assignedSubjectIds = classSubjects.map(s => s.id);
  const availableSubjects = subjects.filter(s => !assignedSubjectIds.includes(s.id));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Manage Classes 🏫</h1>
          <p style={styles.subtitle}>{classes.length} classes in your school</p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.createBtn} onClick={() => { setShowForm(!showForm); setEditClass(null); setForm({ name: '', description: '' }); }}>
            + New Class
          </button>
          <button style={styles.backBtn} onClick={() => navigate('/admin/dashboard')}>
            ← Dashboard
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.successMsg}>{success}</div>}

      {showForm && (
        <div style={styles.formBox}>
          <h3 style={styles.formTitle}>{editClass ? 'Edit Class' : 'Create New Class'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>Class Name *</label>
                <input style={styles.input} required
                  placeholder="e.g. JSS1, SS2A, Grade 5"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <input style={styles.input}
                  placeholder="Optional description"
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                />
              </div>
            </div>
            <div style={styles.formBtns}>
              <button type="submit" style={styles.createBtn}>
                {editClass ? 'Save Changes' : 'Create Class'}
              </button>
              <button type="button" style={styles.backBtn}
                onClick={() => { setShowForm(false); setEditClass(null); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={styles.layout}>
        <div style={styles.leftPanel}>
          {loading ? <p>Loading...</p> : classes.length === 0 ? (
            <div style={styles.empty}>No classes yet. Create one!</div>
          ) : (
            classes.map(cls => (
              <div key={cls.id}
                style={{
                  ...styles.classCard,
                  borderLeft: selectedClass?.id === cls.id ? '4px solid #1E3A5F' : '4px solid transparent',
                  backgroundColor: selectedClass?.id === cls.id ? '#EBF8FF' : 'white'
                }}
                onClick={() => handleSelectClass(cls)}
              >
                <div style={styles.classInfo}>
                  <div style={styles.className}>{cls.name}</div>
                  <div style={styles.classMeta}>
                    👥 {cls.student_count} students · 📚 {cls.subject_count} subjects
                  </div>
                  {cls.description && <div style={styles.classDesc}>{cls.description}</div>}
                </div>
                <div style={styles.classActions}>
                  <button style={styles.editBtn} onClick={e => { e.stopPropagation(); handleEdit(cls); }}>✏️</button>
                  <button style={styles.deleteBtn} onClick={e => { e.stopPropagation(); handleDelete(cls.id); }}>🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.rightPanel}>
          {!selectedClass ? (
            <div style={styles.noSelection}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏫</div>
              <p>Select a class to view details</p>
            </div>
          ) : (
            <div>
              <h2 style={styles.detailTitle}>{selectedClass.name}</h2>

              <div style={styles.detailCard}>
                <h3 style={styles.detailCardTitle}>📚 Subjects</h3>
                <div style={styles.subjectTags}>
                  {classSubjects.length === 0 ? (
                    <p style={styles.emptyText}>No subjects assigned yet</p>
                  ) : (
                    classSubjects.map(s => (
                      <span key={s.id} style={styles.subjectTag}>
                        {s.name}
                        <button style={styles.removeTagBtn}
                          onClick={() => handleRemoveSubject(s.id)}>✕</button>
                      </span>
                    ))
                  )}
                </div>
                {availableSubjects.length > 0 ? (
                  <select style={styles.select}
                    onChange={e => { handleAssignSubject(e.target.value); e.target.value = ''; }}
                    defaultValue=""
                  >
                    <option value="">+ Assign a subject...</option>
                    {availableSubjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <p style={styles.emptyText}>All subjects assigned</p>
                )}
              </div>

              <div style={styles.detailCard}>
                <h3 style={styles.detailCardTitle}>👥 Students ({classStudents.length})</h3>
                {classStudents.length === 0 ? (
                  <p style={styles.emptyText}>No students in this class yet. Add students via <strong>Add User</strong>.</p>
                ) : (
                  <div style={styles.studentList}>
                    {classStudents.map(s => (
                      <div key={s.id} style={styles.studentItem}>
                        <div style={styles.studentAvatar}>
                          {s.first_name[0]}{s.last_name[0]}
                        </div>
                        <div>
                          <div style={styles.studentName}>{s.first_name} {s.last_name}</div>
                          <div style={styles.studentEmail}>{s.email}</div>
                        </div>
                        <span style={{
                          ...styles.statusDot,
                          backgroundColor: s.is_active ? '#38A169' : '#E53E3E'
                        }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '28px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  headerBtns: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  createBtn: { backgroundColor: '#1E3A5F', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  error: { backgroundColor: '#FFF5F5', color: '#E53E3E', padding: '10px', borderRadius: '6px', marginBottom: '16px' },
  successMsg: { backgroundColor: '#F0FFF4', color: '#276749', padding: '10px', borderRadius: '6px', marginBottom: '16px' },
  formBox: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  formTitle: { color: '#1E3A5F', marginBottom: '16px' },
  formRow: { display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' },
  field: { flex: 1, minWidth: '200px' },
  label: { display: 'block', marginBottom: '6px', color: '#333', fontWeight: '500', fontSize: '14px' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DDD', fontSize: '14px', boxSizing: 'border-box' },
  formBtns: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  layout: { display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' },
  leftPanel: { width: '320px', flexShrink: 0, minWidth: '280px', flex: '1 1 280px' },
  rightPanel: { flex: '2 1 300px', minWidth: '280px' },
  classCard: { backgroundColor: 'white', borderRadius: '10px', padding: '16px', marginBottom: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  classInfo: { flex: 1 },
  className: { fontWeight: 'bold', color: '#1E3A5F', fontSize: '16px', marginBottom: '4px' },
  classMeta: { color: '#888', fontSize: '13px' },
  classDesc: { color: '#666', fontSize: '12px', marginTop: '4px' },
  classActions: { display: 'flex', gap: '6px' },
  editBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' },
  empty: { textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  noSelection: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  detailTitle: { color: '#1E3A5F', fontSize: '22px', marginBottom: '16px' },
  detailCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  detailCardTitle: { color: '#1E3A5F', marginBottom: '12px', fontSize: '15px' },
  subjectTags: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' },
  subjectTag: { backgroundColor: '#EBF8FF', color: '#1E3A5F', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' },
  removeTagBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#E53E3E', fontWeight: 'bold', fontSize: '12px' },
  select: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DDD', fontSize: '14px', marginTop: '8px' },
  emptyText: { color: '#888', fontSize: '14px' },
  studentList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  studentItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', backgroundColor: '#F7FAFC', borderRadius: '8px' },
  studentAvatar: { width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#1E3A5F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', flexShrink: 0 },
  studentName: { fontWeight: '500', color: '#333', fontSize: '14px' },
  studentEmail: { color: '#888', fontSize: '12px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', marginLeft: 'auto', flexShrink: 0 }
};

export default ManageClasses;