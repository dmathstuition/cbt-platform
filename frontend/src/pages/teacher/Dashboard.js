import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import ActivityFeed from '../../components/ActivityFeed';

function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, draft: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [examsRes, assignRes] = await Promise.all([
        API.get('/exams'),
        API.get('/subjects/my-assignments')
      ]);
      const allExams = examsRes.data.exams;
      setExams(allExams);
      setAssignments(assignRes.data.assignments || []);
      setStats({
        total: allExams.length,
        active: allExams.filter(e => e.status === 'active').length,
        completed: allExams.filter(e => e.status === 'completed').length,
        draft: allExams.filter(e => e.status === 'draft').length
      });
    } catch (err) {
      console.error('Failed to load data');
    }
    setLoading(false);
  };

  const handleStatusChange = async (id, status) => {
    try {
      await API.patch(`/exams/${id}/status`, { status });
      loadData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this exam? This cannot be undone.')) return;
    try {
      await API.delete(`/exams/${id}`);
      loadData();
    } catch (err) {
      alert('Failed to delete exam');
    }
  };

  const filteredExams = exams.filter(e =>
    activeTab === 'all' ? true : e.status === activeTab
  );

  const statusColor = {
    active: '#38A169', completed: '#718096',
    scheduled: '#3182CE', draft: '#D69E2E'
  };

  const handlePrintQuestions = async (examId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/pdf/exam-questions/${examId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      alert('Failed to generate PDF');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Welcome, {user.first_name} 👋</h1>
          <p style={styles.subtitle}>Teacher Portal — Manage your exams</p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.bankBtn} onClick={() => navigate('/teacher/question-bank')}>
            📚 Question Bank
          </button>
          <button style={styles.createBtn} onClick={() => navigate('/teacher/create-exam')}>
            + New Exam
          </button>
        </div>
      </div>

      {/* Assigned Classes & Subjects */}
      {assignments.length > 0 && (
        <div style={styles.assignmentBox}>
          <h3 style={styles.assignmentTitle}>📋 Your Assigned Classes & Subjects</h3>
          <div style={styles.assignmentGrid}>
            {assignments.map((a, i) => (
              <div key={i} style={styles.assignmentCard}>
                <div style={styles.assignmentClass}>🏫 {a.class_name}</div>
                <div style={styles.assignmentSubject}>📚 {a.subject_name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={styles.statsGrid}>
        {[
          { label: 'Total', value: stats.total, color: '#1E3A5F' },
          { label: 'Drafts', value: stats.draft, color: '#D69E2E' },
          { label: 'Active', value: stats.active, color: '#38A169' },
          { label: 'Completed', value: stats.completed, color: '#718096' }
        ].map((s, i) => (
          <div key={i} style={{...styles.statCard, borderTop: `4px solid ${s.color}`}}>
            <div style={styles.statValue}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['all', 'draft', 'active', 'completed'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              backgroundColor: activeTab === tab ? '#1E3A5F' : 'white',
              color: activeTab === tab ? 'white' : '#333'
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span style={{
              ...styles.tabCount,
              backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.2)' : '#EEE'
            }}>
              {tab === 'all' ? exams.length : exams.filter(e => e.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Exams Grid */}
      {loading ? (
        <p>Loading exams...</p>
      ) : filteredExams.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <p>No exams here yet.</p>
          <button style={{...styles.createBtn, marginTop: '16px'}}
            onClick={() => navigate('/teacher/create-exam')}>
            + Create Your First Exam
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredExams.map(exam => (
            <div key={exam.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.examTitle}>{exam.title}</h3>
                <span style={{
                  ...styles.badge,
                  backgroundColor: statusColor[exam.status] || '#718096'
                }}>
                  {exam.status}
                </span>
              </div>

              <div style={styles.cardBody}>
                <div style={styles.infoRow}>
                  <span>⏱ {exam.duration_minutes} mins</span>
                  <span>📊 {exam.total_marks} marks</span>
                </div>
                <div style={styles.infoRow}>
                  <span>✅ Pass: {exam.pass_mark}%</span>
                  <span>📝 {exam.type}</span>
                </div>
                {exam.class_name && (
                  <div style={styles.examTag}>🏫 {exam.class_name}</div>
                )}
                {exam.subject_name && (
                  <div style={styles.examTag}>📚 {exam.subject_name}</div>
                )}
                {exam.start_at && (
                  <div style={styles.scheduleInfo}>
                    🕐 {new Date(exam.start_at).toLocaleString()}
                  </div>
                )}
              </div>

              <div style={styles.cardActions}>
                {exam.status === 'draft' && (
                  <button style={{...styles.actionBtn, backgroundColor: '#38A169'}}
                    onClick={() => handleStatusChange(exam.id, 'active')}>
                    ▶ Activate
                  </button>
                )}
                {exam.status === 'active' && (
                  <button style={{...styles.actionBtn, backgroundColor: '#718096'}}
                    onClick={() => handleStatusChange(exam.id, 'completed')}>
                    ⏹ Complete
                  </button>
                )}
                <button style={{...styles.actionBtn, backgroundColor: '#3182CE'}}
                  onClick={() => navigate(`/teacher/exam/${exam.id}/questions`)}>
                  📝 Questions
                </button>
                <button style={{...styles.actionBtn, backgroundColor: '#E53E3E'}}
                  onClick={() => navigate(`/teacher/exam/${exam.id}/missing`)}>
                  👥 Missing
                </button>
                <button style={{...styles.actionBtn, backgroundColor: '#1E3A5F'}}
                  onClick={() => handlePrintQuestions(exam.id)}>
                  🖨️ Print
                </button>

                <button style={{...styles.actionBtn, backgroundColor: '#805AD5'}}
                  onClick={() => navigate(`/teacher/exam/${exam.id}/results`)}>
                  📊 Results
                </button>
                <button style={{...styles.actionBtn, backgroundColor: '#E53E3E'}}
                  onClick={() => handleDelete(exam.id)}>
                  🗑️
                </button>
                
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: '24px' }}>
        <ActivityFeed />
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  headerLeft: { flex: 1 },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666', fontSize: '14px' },
  headerBtns: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  bankBtn: { backgroundColor: 'white', border: '2px solid #1E3A5F', color: '#1E3A5F', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  createBtn: { backgroundColor: '#1E3A5F', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  assignmentBox: { backgroundColor: '#EBF8FF', border: '1px solid #BEE3F8', borderRadius: '12px', padding: '16px', marginBottom: '24px' },
  assignmentTitle: { color: '#2A4365', fontSize: '15px', marginBottom: '12px', fontWeight: '700' },
  assignmentGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  assignmentCard: { backgroundColor: 'white', borderRadius: '8px', padding: '10px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', minWidth: '160px' },
  assignmentClass: { color: '#1E3A5F', fontWeight: '600', fontSize: '13px', marginBottom: '4px' },
  assignmentSubject: { color: '#3182CE', fontSize: '12px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginBottom: '24px' },
  statCard: { backgroundColor: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  statValue: { fontSize: '28px', fontWeight: 'bold', color: '#1E3A5F' },
  statLabel: { color: '#666', fontSize: '13px', marginTop: '4px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tab: { padding: '8px 16px', border: '1px solid #DDD', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' },
  tabCount: { padding: '2px 6px', borderRadius: '10px', fontSize: '11px' },
  empty: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  examTitle: { color: '#1E3A5F', fontSize: '15px', flex: 1, marginRight: '8px' },
  badge: { color: 'white', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', flexShrink: 0, fontWeight: 'bold' },
  cardBody: { color: '#555', fontSize: '13px', marginBottom: '14px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  examTag: { backgroundColor: '#EBF8FF', color: '#2A4365', fontSize: '12px', padding: '3px 8px', borderRadius: '4px', marginTop: '4px', display: 'inline-block', marginRight: '4px' },
  scheduleInfo: { color: '#3182CE', fontSize: '12px', marginTop: '6px', backgroundColor: '#EBF8FF', padding: '4px 8px', borderRadius: '4px' },
  cardActions: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  actionBtn: { color: 'white', border: 'none', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }
};

export default TeacherDashboard;