import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import ActivityFeed from '../../components/ActivityFeed';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [statsRes, pendingRes, resultsRes] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/pending'),
        API.get('/admin/results')
      ]);
      setStats(statsRes.data.stats);
      setPendingUsers(pendingRes.data.users);
      setResults(resultsRes.data.results || []);
    } catch (err) {
      console.error('Failed to load stats');
    }
    setLoading(false);
  };

  const handleApprove = async (id) => {
    try {
      await API.patch(`/admin/users/${id}/approve`, { action: 'approve' });
      loadData();
    } catch (err) { alert('Failed to approve'); }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this registration?')) return;
    try {
      await API.patch(`/admin/users/${id}/approve`, { action: 'reject' });
      loadData();
    } catch (err) { alert('Failed to reject'); }
  };

  // Prepare chart data
  const passFailData = [
    { name: 'Passed', value: results.filter(r => r.passed).length, color: '#38A169' },
    { name: 'Failed', value: results.filter(r => !r.passed).length, color: '#E53E3E' }
  ];

  // Group results by exam for bar chart
  const examScores = {};
  results.forEach(r => {
    if (!examScores[r.exam_title]) examScores[r.exam_title] = { title: r.exam_title, total: 0, passed: 0 };
    examScores[r.exam_title].total++;
    if (r.passed) examScores[r.exam_title].passed++;
  });
  const barData = Object.values(examScores).slice(0, 6).map(e => ({
    name: e.title.length > 15 ? e.title.substring(0, 15) + '...' : e.title,
    Passed: e.passed,
    Failed: e.total - e.passed
  }));

  const userBreakdownData = [
    { name: 'Students', value: stats?.students || 0, color: '#1E3A5F' },
    { name: 'Teachers', value: stats?.teachers || 0, color: '#3182CE' },
  ];

  if (loading) return <div style={styles.center}><p>Loading dashboard...</p></div>;

  return (
    <div style={styles.container}>

      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <p style={styles.subtitle}>School overview and management</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button style={styles.reportsBtn} onClick={() => navigate('/admin/reports')}>
            📈 Reports
          </button>
          <button style={styles.notifyBtn} onClick={() => navigate('/admin/notifications')}>
            📢 Notify
          </button>
        </div>
      </div>

      {/* Pending Approvals Banner */}
      {pendingUsers.length > 0 && (
        <div style={styles.pendingBanner}>
          <div style={styles.pendingHeader}>
            <span style={styles.pendingTitle}>🔔 Pending Approvals ({pendingUsers.length})</span>
            <span style={styles.pendingSubtitle}>New student registrations waiting for your approval</span>
          </div>
          <div style={styles.pendingList}>
            {pendingUsers.map(u => (
              <div key={u.id} style={styles.pendingItem}>
                <div style={styles.pendingAvatar}>{u.first_name[0]}{u.last_name[0]}</div>
                <div style={styles.pendingInfo}>
                  <div style={styles.pendingName}>{u.first_name} {u.last_name}</div>
                  <div style={styles.pendingEmail}>{u.email}</div>
                  <div style={styles.pendingDate}>Registered: {new Date(u.created_at).toLocaleDateString('en-GB')}</div>
                </div>
                <div style={styles.pendingActions}>
                  <button style={styles.approveBtn} onClick={() => handleApprove(u.id)}>✅ Approve</button>
                  <button style={styles.rejectBtn} onClick={() => handleReject(u.id)}>❌ Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={styles.statsGrid}>
        {[
          { icon: '👨‍🎓', value: stats?.students || 0, label: 'Students', color: '#1E3A5F' },
          { icon: '👨‍🏫', value: stats?.teachers || 0, label: 'Teachers', color: '#38A169' },
          { icon: '📝', value: stats?.exams || 0, label: 'Exams', color: '#3182CE' },
          { icon: '📊', value: stats?.submissions || 0, label: 'Submissions', color: '#D69E2E' },
          { icon: '✅', value: `${stats?.pass_rate || 0}%`, label: 'Pass Rate', color: '#805AD5' },
          { icon: '⏳', value: pendingUsers.length, label: 'Pending', color: '#E53E3E' }
        ].map((s, i) => (
          <div key={i} style={{ ...styles.statCard, borderTop: `4px solid ${s.color}` }}>
            <div style={styles.statIcon}>{s.icon}</div>
            <div style={styles.statValue}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      {results.length > 0 && (
        <div style={styles.chartsRow}>

          {/* Bar Chart - Exam Performance */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>📊 Exam Performance</h3>
            <p style={styles.chartSubtitle}>Passed vs Failed per exam</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Passed" fill="#38A169" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Failed" fill="#E53E3E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Pass/Fail */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>🎯 Overall Pass Rate</h3>
            <p style={styles.chartSubtitle}>{results.length} total submissions</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={passFailData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {passFailData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Users */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>👥 User Breakdown</h3>
            <p style={styles.chartSubtitle}>Students vs Teachers</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={userBreakdownData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {userBreakdownData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}

      {/* Two column layout */}
      <div style={styles.twoCol}>
        <div style={styles.actionsPanel}>
          <h2 style={styles.sectionTitle}>⚡ Quick Actions</h2>
          <div style={styles.actionsGrid}>
            {[
              { icon: '👥', title: 'Manage Users', desc: 'View, activate or remove users', path: '/admin/users', color: '#1E3A5F' },
              { icon: '➕', title: 'Add User', desc: 'Create teachers, students, parents', path: '/admin/users/add', color: '#38A169' },
              { icon: '🏫', title: 'Manage Classes', desc: 'Classes, students and subjects', path: '/admin/classes', color: '#3182CE' },
              { icon: '📚', title: 'Manage Subjects', desc: 'Subjects and teacher assignments', path: '/admin/subjects', color: '#805AD5' },
              { icon: '📋', title: 'Manage Exams', desc: 'View all exams and status', path: '/admin/exams', color: '#D69E2E' },
              { icon: '📊', title: 'All Results', desc: 'View all student exam results', path: '/admin/results', color: '#E53E3E' },
              { icon: '📢', title: 'Send Notification', desc: 'Announce to students, teachers, parents', path: '/admin/notifications', color: '#3182CE' },
              { icon: '⚙️', title: 'School Settings', desc: 'Name, logo, contact info', path: '/admin/school-settings', color: '#718096' }
            ].map((a, i) => (
              <button key={i}
                style={{ ...styles.actionCard, borderLeft: `4px solid ${a.color}` }}
                onClick={() => navigate(a.path)}
              >
                <span style={styles.actionIcon}>{a.icon}</span>
                <div>
                  <div style={styles.actionTitle}>{a.title}</div>
                  <div style={styles.actionDesc}>{a.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div style={styles.activityPanel}>
          <ActivityFeed isAdmin={true} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '1200px', margin: '0 auto' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  notifyBtn: { backgroundColor: '#E53E3E', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  pendingBanner: { backgroundColor: '#FFFBEB', border: '1px solid #F6E05E', borderRadius: '12px', padding: '20px', marginBottom: '24px' },
  pendingHeader: { marginBottom: '16px' },
  pendingTitle: { color: '#744210', fontWeight: '700', fontSize: '16px', display: 'block' },
  pendingSubtitle: { color: '#975A16', fontSize: '13px', marginTop: '4px', display: 'block' },
  pendingList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  pendingItem: { backgroundColor: 'white', borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  pendingAvatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1E3A5F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', flexShrink: 0 },
  pendingInfo: { flex: 1, minWidth: '150px' },
  pendingName: { fontWeight: '600', color: '#1E3A5F', fontSize: '14px' },
  pendingEmail: { color: '#666', fontSize: '12px' },
  pendingDate: { color: '#999', fontSize: '11px', marginTop: '2px' },
  pendingActions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  approveBtn: { backgroundColor: '#C6F6D5', color: '#276749', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  rejectBtn: { backgroundColor: '#FED7D7', color: '#9B2C2C', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' },
  statCard: { backgroundColor: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  statIcon: { fontSize: '24px', marginBottom: '6px' },
  statValue: { fontSize: '26px', fontWeight: 'bold', color: '#1E3A5F' },
  statLabel: { color: '#666', fontSize: '12px', marginTop: '4px' },
  chartsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' },
  chartCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  chartTitle: { color: '#1E3A5F', fontSize: '15px', fontWeight: '700', marginBottom: '4px' },
  chartSubtitle: { color: '#888', fontSize: '12px', marginBottom: '12px' },
  twoCol: { display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' },
  actionsPanel: { flex: 2, minWidth: '300px' },
  activityPanel: { flex: 1, minWidth: '280px' },
  sectionTitle: { color: '#1E3A5F', fontSize: '18px', marginBottom: '16px' },
  actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' },
  actionCard: { backgroundColor: 'white', borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', border: '1px solid #EEE', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'left', width: '100%' },
  actionIcon: { fontSize: '26px', flexShrink: 0 },
  actionTitle: { fontWeight: '700', color: '#1E3A5F', marginBottom: '3px', fontSize: '14px' },
  actionDesc: { color: '#666', fontSize: '12px' },
  reportsBtn: { backgroundColor: '#805AD5', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
};

export default AdminDashboard;