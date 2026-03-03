import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../services/api';

function EditExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', type: 'mcq', subject_id: '', class_id: '',
    duration_minutes: 30, pass_mark: 50, start_at: '', end_at: ''
  });
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [examRes, subjectsRes, classesRes] = await Promise.all([
        API.get(`/exams/${id}`),
        API.get('/subjects'),
        API.get('/classes')
      ]);
      const exam = examRes.data.exam;
      setForm({
        title: exam.title || '',
        type: exam.type || 'mcq',
        subject_id: exam.subject_id || '',
        class_id: exam.class_id || '',
        duration_minutes: exam.duration_minutes || 30,
        pass_mark: exam.pass_mark || 50,
        start_at: exam.start_at ? exam.start_at.slice(0, 16) : '',
        end_at: exam.end_at ? exam.end_at.slice(0, 16) : ''
      });
      setSubjects(subjectsRes.data.subjects || []);
      setClasses(classesRes.data.classes || []);
    } catch (err) {
      setError('Failed to load exam');
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await API.put(`/exams/${id}`, form);
      setSuccess('✅ Exam updated successfully!');
      setTimeout(() => navigate('/teacher/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update exam');
    }
    setSaving(false);
  };

  if (loading) return <div style={styles.center}><p>Loading exam...</p></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>✏️ Edit Exam</h1>
          <p style={styles.subtitle}>Update exam details</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/teacher/dashboard')}>
          ← Dashboard
        </button>
      </div>

      <div style={styles.card}>
        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        <form onSubmit={handleSave}>
          <div style={styles.field}>
            <label style={styles.label}>Exam Title *</label>
            <input style={styles.input} required
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Mathematics Mid-term Exam"
            />
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Exam Type</label>
              <select style={styles.input}
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="mcq">Multiple Choice</option>
                <option value="mixed">Mixed</option>
                <option value="theory">Theory</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Subject</label>
              <select style={styles.input}
                value={form.subject_id}
                onChange={e => setForm({ ...form, subject_id: e.target.value })}>
                <option value="">Select subject</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Class</label>
              <select style={styles.input}
                value={form.class_id}
                onChange={e => setForm({ ...form, class_id: e.target.value })}>
                <option value="">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Duration (minutes) *</label>
              <input style={styles.input} type="number" min="1" required
                value={form.duration_minutes}
                onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Pass Mark (%)</label>
              <input style={styles.input} type="number" min="0" max="100"
                value={form.pass_mark}
                onChange={e => setForm({ ...form, pass_mark: e.target.value })}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Start Date & Time</label>
              <input style={styles.input} type="datetime-local"
                value={form.start_at}
                onChange={e => setForm({ ...form, start_at: e.target.value })}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>End Date & Time</label>
              <input style={styles.input} type="datetime-local"
                value={form.end_at}
                onChange={e => setForm({ ...form, end_at: e.target.value })}
              />
            </div>
          </div>

          <div style={styles.btnRow}>
            <button type="button" style={styles.cancelBtn}
              onClick={() => navigate('/teacher/dashboard')}>
              Cancel
            </button>
            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '800px', margin: '0 auto' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  errorBox: { backgroundColor: '#FFF5F5', color: '#C53030', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #E53E3E', fontSize: '14px' },
  successBox: { backgroundColor: '#F0FFF4', color: '#276749', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #38A169', fontSize: '14px' },
  field: { flex: 1, marginBottom: '16px' },
  row: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  label: { display: 'block', marginBottom: '6px', color: '#333', fontWeight: '600', fontSize: '14px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '14px', boxSizing: 'border-box' },
  btnRow: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' },
  cancelBtn: { padding: '12px 24px', backgroundColor: 'white', border: '1px solid #DDD', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  saveBtn: { padding: '12px 24px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }
};

export default EditExam;