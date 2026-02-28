import React, { useState, useEffect } from 'react';
import { examAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ActivityFeed from '../../components/ActivityFeed';

function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { loadExams(); }, []);

  const loadExams = async () => {
    try {
      const res = await examAPI.getAll();
      setExams(res.data.exams);
    } catch (err) {
      console.error('Failed to load exams');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Welcome, {user.first_name}! 👋</h1>
          <p style={styles.subtitle}>Here are your available exams</p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.leaderboardBtn} onClick={() => navigate('/student/leaderboard')}>
            🏆 Leaderboard
          </button>
          <button style={styles.resultsBtn} onClick={() => navigate('/student/results')}>
            📊 My Results
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading exams...</p>
      ) : exams.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <p>No exams available at the moment.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {exams.map(exam => (
            <div key={exam.id} style={styles.card}>
              <div style={styles.cardTop}>
                <h3 style={styles.examTitle}>{exam.title}</h3>
                <span style={{
                  ...styles.badge,
                  backgroundColor: exam.status === 'active' ? '#38A169' :
                    exam.status === 'scheduled' ? '#3182CE' : '#718096'
                }}>
                  {exam.status}
                </span>
              </div>
              <div style={styles.cardBody}>
                <div style={styles.infoRow}>
                  <span>⏱ {exam.duration_minutes} min</span>
                  <span>📊 {exam.total_marks} marks</span>
                </div>
                <div style={styles.infoRow}>
                  <span>✅ Pass: {exam.pass_mark}%</span>
                  <span>📝 {exam.type}</span>
                </div>
                {exam.start_at && (
                  <div style={styles.scheduleInfo}>
                    🕐 Starts: {new Date(exam.start_at).toLocaleString()}
                  </div>
                )}
              </div>
              <button
                style={{
                  ...styles.startBtn,
                  backgroundColor: exam.status === 'active' ? '#1E3A5F' : '#CBD5E0',
                  cursor: exam.status === 'active' ? 'pointer' : 'not-allowed'
                }}
                disabled={exam.status !== 'active'}
                onClick={() => navigate(`/student/exam/${exam.id}`)}
              >
                {exam.status === 'active' ? 'Start Exam →' :
                  exam.status === 'scheduled' ? '⏳ Not Started Yet' : '🔒 Not Available'}
              </button>
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
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '24px',
    flexWrap: 'wrap', gap: '12px'
  },
  headerLeft: { flex: 1 },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666', fontSize: '14px' },
  headerBtns: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  leaderboardBtn: {
    backgroundColor: '#D69E2E', color: 'white',
    border: 'none', padding: '10px 16px',
    borderRadius: '8px', cursor: 'pointer',
    fontSize: '14px', fontWeight: 'bold'
  },
  resultsBtn: {
    backgroundColor: 'white', border: '2px solid #1E3A5F',
    color: '#1E3A5F', padding: '10px 16px',
    borderRadius: '8px', cursor: 'pointer',
    fontSize: '14px', fontWeight: 'bold'
  },
  empty: {
    textAlign: 'center', padding: '60px',
    backgroundColor: 'white', borderRadius: '12px', color: '#666'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px'
  },
  card: {
    backgroundColor: 'white', borderRadius: '12px',
    padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  cardTop: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '12px'
  },
  examTitle: { color: '#1E3A5F', fontSize: '15px', flex: 1, marginRight: '8px' },
  badge: {
    color: 'white', padding: '3px 8px',
    borderRadius: '20px', fontSize: '11px',
    flexShrink: 0, fontWeight: 'bold'
  },
  cardBody: { marginBottom: '14px' },
  infoRow: {
    display: 'flex', justifyContent: 'space-between',
    color: '#555', fontSize: '13px', marginBottom: '6px'
  },
  scheduleInfo: {
    color: '#3182CE', fontSize: '12px',
    marginTop: '6px', backgroundColor: '#EBF8FF',
    padding: '4px 8px', borderRadius: '4px'
  },
  startBtn: {
    width: '100%', padding: '12px', color: 'white',
    border: 'none', borderRadius: '8px',
    fontSize: '15px', fontWeight: 'bold'
  }
};

export default StudentDashboard;