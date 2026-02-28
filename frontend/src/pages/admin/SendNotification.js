import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';

function SendNotification() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', message: '', type: 'info', roles: []
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const roleOptions = [
    { value: 'student', label: '👨‍🎓 Students', color: '#38A169' },
    { value: 'teacher', label: '👨‍🏫 Teachers', color: '#3182CE' },
    { value: 'parent', label: '👨‍👩‍👧 Parents', color: '#D69E2E' },
    { value: 'school_admin', label: '👑 Admins', color: '#805AD5' }
  ];

  const typeOptions = [
    { value: 'info', label: 'ℹ️ Info', color: '#3182CE' },
    { value: 'success', label: '✅ Success', color: '#38A169' },
    { value: 'warning', label: '⚠️ Warning', color: '#D69E2E' },
    { value: 'error', label: '❌ Alert', color: '#E53E3E' }
  ];

  const toggleRole = (role) => {
    setForm(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.roles.length === 0) {
      return setError('Please select at least one recipient group');
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await API.post('/notifications/send', form);
      setSuccess(`✅ ${res.data.message}`);
      setForm({ title: '', message: '', type: 'info', roles: [] });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send notification');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📢 Send Notification</h1>
          <p style={styles.subtitle}>Send announcements to students, teachers or parents</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/admin/dashboard')}>
          ← Dashboard
        </button>
      </div>

      <div style={styles.card}>
        {error && <div style={styles.alertError}>{error}</div>}
        {success && <div style={styles.alertSuccess}>{success}</div>}

        <form onSubmit={handleSubmit}>
          {/* Recipients */}
          <div style={styles.field}>
            <label style={styles.label}>👥 Send To (select all that apply) *</label>
            <div style={styles.roleGrid}>
              {roleOptions.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => toggleRole(r.value)}
                  style={{
                    ...styles.roleBtn,
                    backgroundColor: form.roles.includes(r.value) ? r.color : 'white',
                    color: form.roles.includes(r.value) ? 'white' : '#333',
                    border: `2px solid ${form.roles.includes(r.value) ? r.color : '#DDD'}`
                  }}
                >
                  {r.label}
                  {form.roles.includes(r.value) && ' ✓'}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div style={styles.field}>
            <label style={styles.label}>🎨 Notification Type</label>
            <div style={styles.typeRow}>
              {typeOptions.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({...form, type: t.value})}
                  style={{
                    ...styles.typeBtn,
                    backgroundColor: form.type === t.value ? t.color : 'white',
                    color: form.type === t.value ? 'white' : '#333',
                    border: `2px solid ${form.type === t.value ? t.color : '#DDD'}`
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={styles.field}>
            <label style={styles.label}>📌 Title *</label>
            <input
              style={styles.input}
              placeholder="e.g. Exam Schedule Update"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              required
            />
          </div>

          {/* Message */}
          <div style={styles.field}>
            <label style={styles.label}>💬 Message *</label>
            <textarea
              style={styles.textarea}
              placeholder="Type your announcement here..."
              value={form.message}
              onChange={e => setForm({...form, message: e.target.value})}
              required
            />
          </div>

          {/* Preview */}
          {form.title && form.message && (
            <div style={styles.preview}>
              <p style={styles.previewLabel}>Preview:</p>
              <div style={{
                ...styles.previewBox,
                borderLeft: `4px solid ${typeOptions.find(t => t.value === form.type)?.color || '#3182CE'}`
              }}>
                <div style={styles.previewTitle}>
                  {typeOptions.find(t => t.value === form.type)?.label.split(' ')[0]} {form.title}
                </div>
                <div style={styles.previewMsg}>{form.message}</div>
                <div style={styles.previewMeta}>
                  To: {form.roles.map(r => roleOptions.find(o => o.value === r)?.label).join(', ') || 'No recipients selected'}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            style={{
              ...styles.sendBtn,
              opacity: loading ? 0.7 : 1
            }}
            disabled={loading}
          >
            {loading ? 'Sending...' : '📢 Send Notification'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '700px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  alertError: { backgroundColor: '#FFF5F5', color: '#C53030', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #E53E3E' },
  alertSuccess: { backgroundColor: '#F0FFF4', color: '#276749', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #38A169' },
  field: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' },
  roleGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  roleBtn: { padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.15s' },
  typeRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  typeBtn: { padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  input: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #DDD', fontSize: '15px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #DDD', fontSize: '15px', boxSizing: 'border-box', minHeight: '120px', resize: 'vertical' },
  preview: { marginBottom: '20px' },
  previewLabel: { color: '#888', fontSize: '13px', marginBottom: '8px' },
  previewBox: { backgroundColor: '#F7FAFC', borderRadius: '8px', padding: '14px' },
  previewTitle: { fontWeight: '700', color: '#1E3A5F', marginBottom: '6px', fontSize: '15px' },
  previewMsg: { color: '#555', fontSize: '14px', lineHeight: '1.5', marginBottom: '8px' },
  previewMeta: { color: '#888', fontSize: '12px' },
  sendBtn: { width: '100%', backgroundColor: '#1E3A5F', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '700' }
};

export default SendNotification;