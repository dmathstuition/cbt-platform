import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '', school_code: '', email: '', phone: '', address: '',
    admin_first_name: '', admin_last_name: '', admin_email: '', admin_password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [statsRes, schoolsRes] = await Promise.all([
        API.get('/super-admin/stats'),
        API.get('/super-admin/schools')
      ]);
      setStats(statsRes.data.stats);
      setSchools(schoolsRes.data.schools);
    } catch (err) {
      console.error('Failed to load super admin data');
    }
    setLoading(false);
  };

  const handleToggleSchool = async (id, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this school? This will also ${action} all its users.`)) return;
    try {
      await API.patch(`/super-admin/schools/${id}/toggle`);
      setSchools(prev => prev.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s));
      setSuccess(`School ${action}d successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { alert('Failed to update school status'); }
  };

  const handleCreateSchool = async () => {
    setError('');
    if (!form.name || !form.school_code || !form.admin_email || !form.admin_password) {
      setError('Please fill in all required fields');
      return;
    }
    setCreating(true);
    try {
      await API.post('/super-admin/schools', form);
      setSuccess('School created successfully!');
      setShowCreateModal(false);
      setForm({ name: '', school_code: '', email: '', phone: '', address: '', admin_first_name: '', admin_last_name: '', admin_email: '', admin_password: '' });
      loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create school');
    }
    setCreating(false);
  };

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.school_code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={styles.center}><p>Loading platform data...</p></div>;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🌐 Super Admin Panel</h1>
          <p style={styles.subtitle}>Platform-wide management across all schools</p>
        </div>
        <button style={styles.createBtn} onClick={() => setShowCreateModal(true)}>
          ➕ New School
        </button>
      </div>

      {success && <div style={styles.successAlert}>✅ {success}</div>}

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        {[
          { icon: '🏫', label: 'Total Schools', value: stats?.total_schools || 0, sub: `${stats?.active_schools || 0} active`, color: '#1A2F5E' },
          { icon: '👨‍🎓', label: 'Total Students', value: stats?.total_students || 0, sub: 'across all schools', color: '#3182CE' },
          { icon: '👨‍🏫', label: 'Total Teachers', value: stats?.total_teachers || 0, sub: 'across all schools', color: '#38A169' },
          { icon: '📝', label: 'Total Exams', value: stats?.total_exams || 0, sub: `${stats?.total_submissions || 0} submissions`, color: '#805AD5' },
          { icon: '👥', label: 'Total Users', value: stats?.total_users || 0, sub: 'active accounts', color: '#D69E2E' },
          { icon: '⏳', label: 'Pending', value: stats?.pending_approvals || 0, sub: 'awaiting approval', color: '#E53E3E' },
        ].map((k, i) => (
          <div key={i} style={{ ...styles.kpiCard, borderTop: `4px solid ${k.color}` }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{k.icon}</div>
            <div style={{ ...styles.kpiValue, color: k.color }}>{k.value}</div>
            <div style={styles.kpiLabel}>{k.label}</div>
            <div style={styles.kpiSub}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'schools', label: `🏫 Schools (${schools.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            ...styles.tab,
            backgroundColor: activeTab === t.key ? '#1A2F5E' : 'white',
            color: activeTab === t.key ? 'white' : '#555',
            border: `1px solid ${activeTab === t.key ? '#1A2F5E' : '#DDD'}`
          }}>{t.label}</button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div style={styles.chartsGrid}>
          {/* Top schools */}
          <div style={{ ...styles.chartCard, gridColumn: 'span 2' }}>
            <h3 style={styles.chartTitle}>🏆 Most Active Schools</h3>
            <p style={styles.chartSub}>By exam submissions</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.topSchools || []}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="school_code" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="submissions" name="Submissions" fill="#1A2F5E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="users" name="Users" fill="#3182CE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* School breakdown */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>🏫 School Status</h3>
            <div style={{ marginTop: '20px' }}>
              {[
                { label: 'Active Schools', value: stats?.active_schools || 0, color: '#38A169', total: stats?.total_schools },
                { label: 'Inactive Schools', value: (stats?.total_schools - stats?.active_schools) || 0, color: '#E53E3E', total: stats?.total_schools },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#555' }}>{item.label}</span>
                    <span style={{ fontWeight: '700', color: item.color }}>{item.value}</span>
                  </div>
                  <div style={{ backgroundColor: '#EEE', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '99px', backgroundColor: item.color,
                      width: item.total > 0 ? `${(item.value / item.total) * 100}%` : '0%',
                      transition: 'width 0.6s ease'
                    }} />
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F7FAFC', borderRadius: '10px' }}>
                <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px', fontWeight: '700' }}>Platform Summary</div>
                {[
                  { label: 'Avg students/school', value: stats?.total_schools > 0 ? Math.round(stats?.total_students / stats?.total_schools) : 0 },
                  { label: 'Avg exams/school', value: stats?.total_schools > 0 ? Math.round(stats?.total_exams / stats?.total_schools) : 0 },
                  { label: 'Avg submissions/school', value: stats?.total_schools > 0 ? Math.round(stats?.total_submissions / stats?.total_schools) : 0 },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>{item.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#1A2F5E' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCHOOLS TAB */}
      {activeTab === 'schools' && (
        <div>
          {/* Search */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text" placeholder="🔍 Search schools by name or code..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Schools Grid */}
          <div style={styles.schoolsGrid}>
            {filteredSchools.map(school => (
              <div key={school.id} style={{
                ...styles.schoolCard,
                borderLeft: `4px solid ${school.is_active ? '#38A169' : '#E53E3E'}`
              }}>
                {/* School Header */}
                <div style={styles.schoolHeader}>
                  <div style={styles.schoolAvatar}>
                    {school.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.schoolName}>{school.name}</div>
                    <div style={styles.schoolCode}>Code: {school.school_code}</div>
                  </div>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: school.is_active ? '#C6F6D5' : '#FED7D7',
                    color: school.is_active ? '#276749' : '#9B2C2C'
                  }}>
                    {school.is_active ? '● Active' : '● Inactive'}
                  </span>
                </div>

                {/* Stats Row */}
                <div style={styles.schoolStats}>
                  {[
                    { icon: '👨‍🎓', value: school.students || 0, label: 'Students' },
                    { icon: '👨‍🏫', value: school.teachers || 0, label: 'Teachers' },
                    { icon: '📝', value: school.exams || 0, label: 'Exams' },
                    { icon: '📊', value: school.submissions || 0, label: 'Submissions' },
                  ].map((s, i) => (
                    <div key={i} style={styles.schoolStat}>
                      <div style={{ fontSize: '16px' }}>{s.icon}</div>
                      <div style={styles.schoolStatValue}>{s.value}</div>
                      <div style={styles.schoolStatLabel}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Contact */}
                {(school.email || school.phone) && (
                  <div style={styles.schoolContact}>
                    {school.email && <span>✉️ {school.email}</span>}
                    {school.phone && <span>📞 {school.phone}</span>}
                  </div>
                )}

                <div style={styles.schoolFooter}>
                  <span style={styles.schoolDate}>
                    Created: {new Date(school.created_at).toLocaleDateString('en-GB')}
                  </span>
                  <div style={styles.schoolActions}>
                    <button
                      style={{ ...styles.actionBtn, backgroundColor: '#EBF8FF', color: '#2B6CB0' }}
                      onClick={() => navigate(`/super-admin/school/${school.id}`)}
                    >
                      👁 View
                    </button>
                    <button
                      style={{
                        ...styles.actionBtn,
                        backgroundColor: school.is_active ? '#FFF5F5' : '#F0FFF4',
                        color: school.is_active ? '#C53030' : '#276749'
                      }}
                      onClick={() => handleToggleSchool(school.id, school.is_active)}
                    >
                      {school.is_active ? '⏸ Deactivate' : '▶ Activate'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredSchools.length === 0 && (
            <div style={styles.empty}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏫</div>
              <p>No schools found</p>
            </div>
          )}
        </div>
      )}

      {/* CREATE SCHOOL MODAL */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>🏫 Create New School</h2>
              <button style={styles.closeBtn} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            {error && <div style={styles.errorAlert}>{error}</div>}

            <div style={styles.modalBody}>
              <div style={styles.formSection}>
                <div style={styles.sectionLabel}>School Information</div>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>School Name *</label>
                    <input style={styles.input} placeholder="e.g. D-MATHS ACADEMY"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>School Code *</label>
                    <input style={styles.input} placeholder="e.g. DMATHS001"
                      value={form.school_code} onChange={e => setForm({ ...form, school_code: e.target.value.toUpperCase() })} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email</label>
                    <input style={styles.input} type="email" placeholder="school@email.com"
                      value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Phone</label>
                    <input style={styles.input} placeholder="+234..."
                      value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                    <label style={styles.label}>Address</label>
                    <input style={styles.input} placeholder="School address"
                      value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                  </div>
                </div>
              </div>

              <div style={styles.formSection}>
                <div style={styles.sectionLabel}>School Admin Account</div>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>First Name *</label>
                    <input style={styles.input} placeholder="Admin first name"
                      value={form.admin_first_name} onChange={e => setForm({ ...form, admin_first_name: e.target.value })} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Last Name *</label>
                    <input style={styles.input} placeholder="Admin last name"
                      value={form.admin_last_name} onChange={e => setForm({ ...form, admin_last_name: e.target.value })} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Admin Email *</label>
                    <input style={styles.input} type="email" placeholder="admin@school.com"
                      value={form.admin_email} onChange={e => setForm({ ...form, admin_email: e.target.value })} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Admin Password *</label>
                    <input style={styles.input} type="password" placeholder="Minimum 8 characters"
                      value={form.admin_password} onChange={e => setForm({ ...form, admin_password: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button style={styles.submitBtn} onClick={handleCreateSchool} disabled={creating}>
                {creating ? '⏳ Creating...' : '🏫 Create School'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '1300px', margin: '0 auto', paddingBottom: '40px' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1A2F5E', fontSize: '26px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  createBtn: { backgroundColor: '#1A2F5E', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  successAlert: { backgroundColor: '#C6F6D5', color: '#276749', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: '600' },
  errorAlert: { backgroundColor: '#FED7D7', color: '#9B2C2C', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px', marginBottom: '24px' },
  kpiCard: { backgroundColor: 'white', borderRadius: '14px', padding: '18px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  kpiValue: { fontSize: '28px', fontWeight: '800', lineHeight: 1 },
  kpiLabel: { color: '#555', fontSize: '13px', fontWeight: '600', margin: '6px 0 2px' },
  kpiSub: { color: '#999', fontSize: '11px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  tab: { padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  chartCard: { backgroundColor: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  chartTitle: { color: '#1A2F5E', fontSize: '15px', fontWeight: '700', marginBottom: '4px' },
  chartSub: { color: '#888', fontSize: '12px', marginBottom: '12px' },
  searchInput: { width: '100%', padding: '10px 16px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  schoolsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' },
  schoolCard: { backgroundColor: 'white', borderRadius: '14px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #EEE' },
  schoolHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' },
  schoolAvatar: { width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#1A2F5E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', flexShrink: 0 },
  schoolName: { fontWeight: '800', color: '#1A2F5E', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  schoolCode: { color: '#888', fontSize: '12px', marginTop: '2px' },
  statusBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', flexShrink: 0 },
  schoolStats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px', backgroundColor: '#F7FAFC', borderRadius: '10px', padding: '10px' },
  schoolStat: { textAlign: 'center' },
  schoolStatValue: { fontWeight: '800', color: '#1A2F5E', fontSize: '16px' },
  schoolStatLabel: { color: '#888', fontSize: '10px', marginTop: '2px' },
  schoolContact: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px', fontSize: '12px', color: '#666' },
  schoolFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '10px', borderTop: '1px solid #EEE' },
  schoolDate: { color: '#999', fontSize: '11px' },
  schoolActions: { display: 'flex', gap: '8px' },
  actionBtn: { padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  empty: { textAlign: 'center', padding: '60px', color: '#888' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  modal: { backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #EEE', backgroundColor: '#1A2F5E' },
  modalTitle: { color: 'white', fontSize: '18px', fontWeight: '800' },
  closeBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px' },
  modalBody: { padding: '20px 24px', overflowY: 'auto', flex: 1 },
  modalFooter: { padding: '16px 24px', borderTop: '1px solid #EEE', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
  formSection: { marginBottom: '20px' },
  sectionLabel: { fontSize: '12px', fontWeight: '800', color: '#1A2F5E', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', paddingBottom: '6px', borderBottom: '2px solid #EBF8FF' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#555' },
  input: { padding: '9px 12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '13px', outline: 'none' },
  cancelBtn: { backgroundColor: '#EDF2F7', color: '#555', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  submitBtn: { backgroundColor: '#1A2F5E', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
};

export default SuperAdminDashboard;