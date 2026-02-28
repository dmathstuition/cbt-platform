import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';

function AddUser() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', role: 'student', class_id: '',
    student_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdUsers, setCreatedUsers] = useState([]);

  useEffect(() => {
    API.get('/classes').then(res => setClasses(res.data.classes)).catch(() => {});
    API.get('/admin/users').then(res => {
      const studentList = res.data.users.filter(u => u.role === 'student');
      setStudents(studentList);
    }).catch(() => {});
  }, []);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setForm({ ...form, password: pwd });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const school_id = JSON.parse(atob(token.split('.')[1])).school_id;

      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        role: form.role,
        school_id,
        send_credentials: true // flag to send email
      };

      if (form.role === 'student' && form.class_id) payload.class_id = form.class_id;

      const res = await API.post('/admin/users', payload);
      const newUser = res.data?.user;

      // If parent, link to student if selected
      if (form.role === 'parent' && form.student_id && newUser?.id) {
        try {
          await API.post('/parent/link-by-admin', {
            parent_id: newUser.id,
            student_id: form.student_id
          });
        } catch (linkErr) {
          console.error('Failed to link parent to student');
        }
      }

      setSuccess(`✅ ${form.first_name} ${form.last_name} created! Login credentials sent to ${form.email}`);
      setCreatedUsers(prev => [...prev, { ...form, id: newUser?.id }]);
      setForm({ first_name: '', last_name: '', email: '', password: '', role: form.role, class_id: '', student_id: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
    setLoading(false);
  };

  const roleOptions = [
    { value: 'student', label: '👨‍🎓 Student', color: '#38A169' },
    { value: 'teacher', label: '👨‍🏫 Teacher', color: '#3182CE' },
    { value: 'parent', label: '👨‍👩‍👧 Parent', color: '#D69E2E' },
    { value: 'school_admin', label: '👑 Admin', color: '#805AD5' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Add New User ➕</h1>
          <p style={styles.subtitle}>Create accounts and send login credentials by email</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/admin/dashboard')}>
          ← Dashboard
        </button>
      </div>

      <div style={styles.layout}>
        {/* Form */}
        <div style={styles.formPanel}>
          <div style={styles.formBox}>

            {/* Role Selector */}
            <div style={styles.roleGrid}>
              {roleOptions.map(r => (
                <button key={r.value} type="button"
                  style={{
                    ...styles.roleBtn,
                    backgroundColor: form.role === r.value ? r.color : 'white',
                    color: form.role === r.value ? 'white' : '#333',
                    border: `2px solid ${form.role === r.value ? r.color : '#DDD'}`
                  }}
                  onClick={() => setForm({ ...form, role: r.value, class_id: '', student_id: '' })}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.successMsg}>{success}</div>}

            <form onSubmit={handleSubmit}>
              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>First Name *</label>
                  <input style={styles.input} required placeholder="John"
                    value={form.first_name}
                    onChange={e => setForm({ ...form, first_name: e.target.value })}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Last Name *</label>
                  <input style={styles.input} required placeholder="Doe"
                    value={form.last_name}
                    onChange={e => setForm({ ...form, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Email Address *</label>
                <input style={styles.input} type="email" required
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Password *</label>
                <div style={styles.passwordRow}>
                  <input style={{ ...styles.input, flex: 1 }} required
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                  />
                  <button type="button" style={styles.generateBtn} onClick={generatePassword}>
                    🔀 Generate
                  </button>
                </div>
                {form.password && (
                  <div style={styles.passwordPreview}>
                    Password: <strong>{form.password}</strong> — will be emailed to user
                  </div>
                )}
              </div>

              {/* Student — class selector */}
              {form.role === 'student' && (
                <div style={styles.field}>
                  <label style={styles.label}>Assign to Class</label>
                  <select style={styles.input}
                    value={form.class_id}
                    onChange={e => setForm({ ...form, class_id: e.target.value })}
                  >
                    <option value="">Select a class (optional)</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Parent — link to student */}
              {form.role === 'parent' && (
                <div style={styles.field}>
                  <label style={styles.label}>Link to Student (optional)</label>
                  <select style={styles.input}
                    value={form.student_id}
                    onChange={e => setForm({ ...form, student_id: e.target.value })}
                  >
                    <option value="">Select a student</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} — {s.email}
                      </option>
                    ))}
                  </select>
                  <p style={styles.hint}>
                    💡 Parent will receive login credentials by email and can monitor their child's results
                  </p>
                </div>
              )}

              {/* Info box based on role */}
              <div style={{
                ...styles.infoBox,
                backgroundColor: form.role === 'parent' ? '#FFFBEB' :
                  form.role === 'teacher' ? '#EBF8FF' : '#F0FFF4',
                borderLeft: `4px solid ${form.role === 'parent' ? '#D69E2E' :
                  form.role === 'teacher' ? '#3182CE' : '#38A169'}`
              }}>
                {form.role === 'student' && '👨‍🎓 Student will receive login credentials by email and can take assigned exams.'}
                {form.role === 'teacher' && '👨‍🏫 Teacher will receive login credentials by email and can create/manage exams.'}
                {form.role === 'parent' && '👨‍👩‍👧 Parent will receive login credentials by email and can monitor their child\'s exam results.'}
                {form.role === 'school_admin' && '👑 Admin will have full access to manage the school platform.'}
              </div>

              <button type="submit" style={styles.submitBtn} disabled={loading}>
                {loading ? 'Creating...' : `✉️ Create & Send Login to ${form.role === 'teacher' ? 'Teacher' : form.role === 'parent' ? 'Parent' : form.role === 'school_admin' ? 'Admin' : 'Student'}`}
              </button>
            </form>
          </div>
        </div>

        {/* Recently Created */}
        <div style={styles.rightPanel}>
          <h3 style={styles.sectionTitle}>Recently Created ({createdUsers.length})</h3>
          {createdUsers.length === 0 ? (
            <div style={styles.empty}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>👤</div>
              <p>Users you create will appear here</p>
            </div>
          ) : (
            [...createdUsers].reverse().map((u, i) => (
              <div key={i} style={styles.userCard}>
                <div style={styles.userAvatar}>
                  {u.first_name[0]}{u.last_name[0]}
                </div>
                <div style={styles.userInfo}>
                  <div style={styles.userName}>{u.first_name} {u.last_name}</div>
                  <div style={styles.userEmail}>{u.email}</div>
                  <span style={{
                    ...styles.roleBadge,
                    backgroundColor: u.role === 'teacher' ? '#3182CE' :
                      u.role === 'school_admin' ? '#805AD5' :
                      u.role === 'parent' ? '#D69E2E' : '#38A169'
                  }}>
                    {u.role}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '1100px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  layout: { display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' },
  formPanel: { flex: 1, minWidth: '300px' },
  rightPanel: { width: '300px', flexShrink: 0, minWidth: '260px' },
  formBox: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  roleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' },
  roleBtn: { padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' },
  error: { backgroundColor: '#FFF5F5', color: '#E53E3E', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' },
  successMsg: { backgroundColor: '#F0FFF4', color: '#276749', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' },
  formRow: { display: 'flex', gap: '16px' },
  field: { flex: 1, marginBottom: '16px' },
  label: { display: 'block', marginBottom: '6px', color: '#333', fontWeight: '600', fontSize: '14px' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DDD', fontSize: '14px', boxSizing: 'border-box' },
  passwordRow: { display: 'flex', gap: '8px' },
  generateBtn: { backgroundColor: '#EDF2F7', border: '1px solid #DDD', padding: '10px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', fontWeight: '600' },
  passwordPreview: { marginTop: '6px', fontSize: '12px', color: '#666', backgroundColor: '#FFFBEB', padding: '6px 10px', borderRadius: '6px' },
  hint: { color: '#888', fontSize: '12px', marginTop: '6px' },
  infoBox: { padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#555', marginBottom: '16px', lineHeight: '1.5' },
  submitBtn: { width: '100%', padding: '14px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '700', marginTop: '8px' },
  sectionTitle: { color: '#1E3A5F', marginBottom: '16px', fontSize: '16px' },
  empty: { textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  userCard: { backgroundColor: 'white', borderRadius: '10px', padding: '14px', marginBottom: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '12px' },
  userAvatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1E3A5F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', flexShrink: 0 },
  userInfo: { flex: 1 },
  userName: { fontWeight: 'bold', color: '#333', fontSize: '14px' },
  userEmail: { color: '#888', fontSize: '12px', marginBottom: '4px' },
  roleBadge: { color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }
};

export default AddUser;