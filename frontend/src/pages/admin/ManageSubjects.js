import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subjectAPI, classAPI } from '../../services/api';
import API from '../../services/api';

function ManageSubjects() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [assignForm, setAssignForm] = useState({ teacher_id: '', subject_id: '', class_id: '' });
  const [showAssign, setShowAssign] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [sRes, cRes, uRes, aRes] = await Promise.all([
        subjectAPI.getAll(),
        classAPI.getAll(),
        API.get('/admin/users?role=teacher'),
        subjectAPI.getAssignments()
      ]);
      setSubjects(sRes.data.subjects);
      setClasses(cRes.data.classes);
      setTeachers(uRes.data.users);
      setAssignments(aRes.data.assignments);
    } catch (err) {
      console.error('Failed to load:', err.message);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editSubject) {
        await subjectAPI.update(editSubject.id, form);
        setSuccess('Subject updated!');
      } else {
        await subjectAPI.create(form);
        setSuccess('Subject created!');
      }
      setForm({ name: '', description: '' });
      setEditSubject(null);
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save subject');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subject?')) return;
    try {
      await subjectAPI.delete(id);
      setSuccess('Subject deleted');
      loadData();
    } catch (err) {
      setError('Failed to delete subject');
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await subjectAPI.assignTeacher(assignForm);
      setSuccess('Teacher assigned successfully!');
      setAssignForm({ teacher_id: '', subject_id: '', class_id: '' });
      setShowAssign(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign teacher');
    }
  };

  const handleRemoveAssignment = async (id) => {
    if (!window.confirm('Remove this assignment?')) return;
    try {
      await subjectAPI.removeAssignment(id);
      setSuccess('Assignment removed');
      loadData();
    } catch (err) {
      setError('Failed to remove assignment');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Manage Subjects 📚</h1>
          <p style={styles.subtitle}>{subjects.length} subjects · {assignments.length} teacher assignments</p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.assignBtn} onClick={() => { setShowAssign(!showAssign); setShowForm(false); }}>
            👤 Assign Teacher
          </button>
          <button style={styles.createBtn} onClick={() => { setShowForm(!showForm); setShowAssign(false); setEditSubject(null); setForm({ name: '', description: '' }); }}>
            + New Subject
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
          <h3 style={styles.formTitle}>{editSubject ? 'Edit Subject' : 'Create New Subject'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>Subject Name *</label>
                <input style={styles.input} required
                  placeholder="e.g. Mathematics, English, Physics"
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
                {editSubject ? 'Save Changes' : 'Create Subject'}
              </button>
              <button type="button" style={styles.backBtn} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showAssign && (
        <div style={styles.formBox}>
          <h3 style={styles.formTitle}>👤 Assign Teacher to Subject & Class</h3>
          {teachers.length === 0 && (
            <div style={styles.warningBox}>
              ⚠️ No teachers found. Please create teacher accounts first via <strong>Add User</strong>.
            </div>
          )}
          {subjects.length === 0 && (
            <div style={styles.warningBox}>
              ⚠️ No subjects found. Please create subjects first.
            </div>
          )}
          {classes.length === 0 && (
            <div style={styles.warningBox}>
              ⚠️ No classes found. Please create classes first via <strong>Manage Classes</strong>.
            </div>
          )}
          <form onSubmit={handleAssign}>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>Teacher *</label>
                <select style={styles.input} required
                  value={assignForm.teacher_id}
                  onChange={e => setAssignForm({...assignForm, teacher_id: e.target.value})}
                >
                  <option value="">Select teacher...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Subject *</label>
                <select style={styles.input} required
                  value={assignForm.subject_id}
                  onChange={e => setAssignForm({...assignForm, subject_id: e.target.value})}
                >
                  <option value="">Select subject...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Class *</label>
                <select style={styles.input} required
                  value={assignForm.class_id}
                  onChange={e => setAssignForm({...assignForm, class_id: e.target.value})}
                >
                  <option value="">Select class...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={styles.formBtns}>
              <button type="submit" style={styles.createBtn}>Assign Teacher</button>
              <button type="button" style={styles.backBtn} onClick={() => setShowAssign(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={styles.layout}>
        <div style={styles.leftPanel}>
          <h3 style={styles.sectionTitle}>All Subjects</h3>
          {loading ? <p>Loading...</p> : subjects.length === 0 ? (
            <div style={styles.empty}>No subjects yet. Create one!</div>
          ) : (
            subjects.map(s => (
              <div key={s.id} style={styles.subjectCard}>
                <div style={styles.subjectInfo}>
                  <div style={styles.subjectName}>{s.name}</div>
                  <div style={styles.subjectMeta}>
                    🏫 {s.class_count} classes · 👤 {s.teacher_count} teachers
                  </div>
                  {s.description && <div style={styles.subjectDesc}>{s.description}</div>}
                </div>
                <div style={styles.subjectActions}>
                  <button style={styles.editBtn} onClick={() => {
                    setEditSubject(s);
                    setForm({ name: s.name, description: s.description || '' });
                    setShowForm(true);
                    setShowAssign(false);
                  }}>✏️</button>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(s.id)}>🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.rightPanel}>
          <h3 style={styles.sectionTitle}>Teacher Assignments ({assignments.length})</h3>
          {assignments.length === 0 ? (
            <div style={styles.empty}>
              <p>No teacher assignments yet.</p>
              <button style={{...styles.createBtn, marginTop: '12px'}} onClick={() => setShowAssign(true)}>
                👤 Assign a Teacher
              </button>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHead}>
                    <th style={styles.th}>Teacher</th>
                    <th style={styles.th}>Subject</th>
                    <th style={styles.th}>Class</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(a => (
                    <tr key={a.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <div style={styles.teacherName}>{a.teacher_name}</div>
                        <div style={styles.teacherEmail}>{a.teacher_email}</div>
                      </td>
                      <td style={styles.td}>{a.subject_name}</td>
                      <td style={styles.td}>{a.class_name}</td>
                      <td style={styles.td}>
                        <button style={styles.removeBtn} onClick={() => handleRemoveAssignment(a.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
  assignBtn: { backgroundColor: '#805AD5', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  error: { backgroundColor: '#FFF5F5', color: '#E53E3E', padding: '10px', borderRadius: '6px', marginBottom: '16px' },
  successMsg: { backgroundColor: '#F0FFF4', color: '#276749', padding: '10px', borderRadius: '6px', marginBottom: '16px' },
  warningBox: { backgroundColor: '#FFFBEB', color: '#744210', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '14px' },
  formBox: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  formTitle: { color: '#1E3A5F', marginBottom: '16px' },
  formRow: { display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' },
  field: { flex: 1, minWidth: '180px' },
  label: { display: 'block', marginBottom: '6px', color: '#333', fontWeight: '500', fontSize: '14px' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DDD', fontSize: '14px', boxSizing: 'border-box' },
  formBtns: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  layout: { display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' },
  leftPanel: { flex: '1 1 280px', minWidth: '280px' },
  rightPanel: { flex: '2 1 300px', minWidth: '280px' },
  sectionTitle: { color: '#1E3A5F', marginBottom: '16px', fontSize: '16px' },
  subjectCard: { backgroundColor: 'white', borderRadius: '10px', padding: '16px', marginBottom: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  subjectInfo: { flex: 1 },
  subjectName: { fontWeight: 'bold', color: '#1E3A5F', fontSize: '16px', marginBottom: '4px' },
  subjectMeta: { color: '#888', fontSize: '13px' },
  subjectDesc: { color: '#666', fontSize: '12px', marginTop: '4px' },
  subjectActions: { display: 'flex', gap: '6px' },
  editBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' },
  empty: { textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  tableWrapper: { backgroundColor: 'white', borderRadius: '12px', overflow: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '400px' },
  tableHead: { backgroundColor: '#1E3A5F' },
  th: { padding: '12px 16px', textAlign: 'left', color: 'white', fontWeight: '600', fontSize: '13px' },
  tableRow: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#333' },
  teacherName: { fontWeight: '500', color: '#1E3A5F' },
  teacherEmail: { color: '#888', fontSize: '12px' },
  removeBtn: { backgroundColor: '#FED7D7', color: '#9B2C2C', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }
};

export default ManageSubjects;