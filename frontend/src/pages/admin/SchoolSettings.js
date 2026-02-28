import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';

function SchoolSettings() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', address: '', phone: '',
    email: '', website: '', motto: '', logo_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await API.get('/admin/school-settings');
      const s = res.data.school;
      setForm({
        name: s.name || '',
        address: s.address || '',
        phone: s.phone || '',
        email: s.email || '',
        website: s.website || '',
        motto: s.motto || '',
        logo_url: s.logo_url || ''
      });
    } catch (err) {
      console.error('Failed to load settings');
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await API.put('/admin/school-settings', form);
      setSuccess('✅ School settings saved successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    }
    setSaving(false);
  };

  if (loading) return <div style={styles.center}><p>Loading settings...</p></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🏫 School Settings</h1>
          <p style={styles.subtitle}>Manage your school's information</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/admin/dashboard')}>
          ← Dashboard
        </button>
      </div>

      <div style={styles.layout}>
        {/* Form */}
        <div style={styles.formPanel}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📋 Basic Information</h3>
            {error && <div style={styles.errorBox}>{error}</div>}
            {success && <div style={styles.successBox}>{success}</div>}

            <form onSubmit={handleSave}>
              <div style={styles.field}>
                <label style={styles.label}>School Name *</label>
                <input style={styles.input} required
                  placeholder="e.g. Greenfield Academy"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>School Motto</label>
                <input style={styles.input}
                  placeholder="e.g. Excellence in Education"
                  value={form.motto}
                  onChange={e => setForm({ ...form, motto: e.target.value })}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Address</label>
                <textarea style={{ ...styles.input, height: '80px', resize: 'vertical' }}
                  placeholder="School address"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Phone Number</label>
                  <input style={styles.input}
                    placeholder="+234 800 000 0000"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Email Address</label>
                  <input style={styles.input} type="email"
                    placeholder="school@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Website</label>
                <input style={styles.input}
                  placeholder="https://www.school.com"
                  value={form.website}
                  onChange={e => setForm({ ...form, website: e.target.value })}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Logo URL</label>
                <input style={styles.input}
                  placeholder="https://yourschool.com/logo.png"
                  value={form.logo_url}
                  onChange={e => setForm({ ...form, logo_url: e.target.value })}
                />
                <p style={styles.hint}>
                  💡 Paste a direct link to your school logo image.
                  The logo will appear on PDF report cards.
                </p>
              </div>

              <button type="submit" style={styles.saveBtn} disabled={saving}>
                {saving ? '⏳ Saving...' : '💾 Save Settings'}
              </button>
            </form>
          </div>
        </div>

        {/* Preview */}
        <div style={styles.previewPanel}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>👁️ Preview</h3>
            <div style={styles.previewCard}>
              {form.logo_url ? (
                <img
                  src={form.logo_url}
                  alt="School Logo"
                  style={styles.logoPreview}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={styles.logoPlaceholder}>🏫</div>
              )}
              <div style={styles.previewName}>
                {form.name || 'School Name'}
              </div>
              {form.motto && (
                <div style={styles.previewMotto}>"{form.motto}"</div>
              )}
              <div style={styles.previewDivider} />
              {form.address && (
                <div style={styles.previewItem}>📍 {form.address}</div>
              )}
              {form.phone && (
                <div style={styles.previewItem}>📞 {form.phone}</div>
              )}
              {form.email && (
                <div style={styles.previewItem}>✉️ {form.email}</div>
              )}
              {form.website && (
                <div style={styles.previewItem}>🌐 {form.website}</div>
              )}
            </div>

            <div style={styles.infoBox}>
              <strong>ℹ️ Where this info is used:</strong>
              <ul style={{ marginTop: '8px', paddingLeft: '20px', color: '#555', fontSize: '13px' }}>
                <li>PDF Report Cards header</li>
                <li>Exam results PDF</li>
                <li>Student notification emails</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '1100px', margin: '0 auto' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' },
  layout: { display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' },
  formPanel: { flex: 2, minWidth: '300px' },
  previewPanel: { flex: 1, minWidth: '260px' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  cardTitle: { color: '#1E3A5F', fontSize: '16px', fontWeight: '700', marginBottom: '20px' },
  errorBox: { backgroundColor: '#FFF5F5', color: '#C53030', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #E53E3E', fontSize: '14px' },
  successBox: { backgroundColor: '#F0FFF4', color: '#276749', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #38A169', fontSize: '14px' },
  field: { flex: 1, marginBottom: '16px' },
  row: { display: 'flex', gap: '16px' },
  label: { display: 'block', marginBottom: '6px', color: '#333', fontWeight: '600', fontSize: '14px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' },
  hint: { color: '#888', fontSize: '12px', marginTop: '6px' },
  saveBtn: { width: '100%', padding: '14px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '700', marginTop: '8px' },
  previewCard: { backgroundColor: '#F7FAFC', borderRadius: '12px', padding: '24px', textAlign: 'center', marginBottom: '16px', border: '1px solid #E2E8F0' },
  logoPreview: { width: '80px', height: '80px', objectFit: 'contain', marginBottom: '12px', borderRadius: '8px' },
  logoPlaceholder: { fontSize: '48px', marginBottom: '12px' },
  previewName: { color: '#1E3A5F', fontWeight: '700', fontSize: '18px', marginBottom: '4px' },
  previewMotto: { color: '#666', fontSize: '13px', fontStyle: 'italic', marginBottom: '12px' },
  previewDivider: { borderTop: '1px solid #DDD', margin: '12px 0' },
  previewItem: { color: '#555', fontSize: '13px', marginBottom: '6px', textAlign: 'left' },
  infoBox: { backgroundColor: '#EBF8FF', borderRadius: '8px', padding: '14px', fontSize: '13px', color: '#2A4365' }
};

export default SchoolSettings;