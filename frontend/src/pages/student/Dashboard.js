import React, { useState, useEffect } from 'react';
import { examAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({});
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const newCountdowns = {};
      exams.filter(e => e.status === 'scheduled' && e.start_at).forEach(exam => {
        const diff = new Date(exam.start_at) - new Date();
        if (diff > 0) {
          const days = Math.floor(diff / 86400000);
          const hours = Math.floor((diff % 86400000) / 3600000);
          const mins = Math.floor((diff % 3600000) / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          newCountdowns[exam.id] = { days, hours, mins, secs };
        }
      });
      setCountdown(newCountdowns);
    }, 1000);
    return () => clearInterval(timer);
  }, [exams]);

  const loadData = async () => {
    try {
      const [examsRes, resultsRes] = await Promise.all([
        examAPI.getAll(),
        API.get('/sessions/my-results')
      ]);
      setExams(examsRes.data.exams);
      setResults(resultsRes.data.results || []);
    } catch (err) {
      console.error('Failed to load data');
    }
    setLoading(false);
  };

  // Stats
  const totalExams = results.length;
  const passed = results.filter(r => r.passed).length;
  const avgScore = totalExams > 0
    ? (results.reduce((s, r) => s + parseFloat(r.percentage || 0), 0) / totalExams).toFixed(1)
    : 0;
  const streak = Math.min(totalExams, 7);

  // Chart data - last 6 results
  const chartData = [...results].reverse().slice(0, 6).map(r => ({
    name: r.exam_title?.substring(0, 10) + '...',
    score: parseFloat(r.percentage || 0)
  }));

  // Achievements
  const achievements = [
    { icon: '🎯', label: 'First Exam', earned: totalExams >= 1 },
    { icon: '🔥', label: '3 Exams', earned: totalExams >= 3 },
    { icon: '⭐', label: '5 Exams', earned: totalExams >= 5 },
    { icon: '🏆', label: 'Perfect Score', earned: results.some(r => parseFloat(r.percentage) === 100) },
    { icon: '💪', label: 'All Passed', earned: totalExams > 0 && passed === totalExams },
    { icon: '📈', label: 'Above 80%', earned: results.some(r => parseFloat(r.percentage) >= 80) }
  ];

  if (loading) return <div style={styles.center}><p>Loading...</p></div>;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Welcome, {user.first_name}! 👋</h1>
          <p style={styles.subtitle}>Your learning dashboard</p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.leaderboardBtn} onClick={() => navigate('/student/leaderboard')}>🏆 Leaderboard</button>
          <button style={styles.resultsBtn} onClick={() => navigate('/student/results')}>📊 My Results</button>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        {[
          { icon: '📝', value: totalExams, label: 'Exams Taken', color: '#1E3A5F' },
          { icon: '✅', value: passed, label: 'Passed', color: '#38A169' },
          { icon: '📈', value: `${avgScore}%`, label: 'Average Score', color: '#3182CE' },
          { icon: '🔥', value: `${streak}`, label: 'Day Streak', color: '#D69E2E' }
        ].map((s, i) => (
          <div key={i} style={{ ...styles.statCard, borderTop: `4px solid ${s.color}` }}>
            <div style={styles.statIcon}>{s.icon}</div>
            <div style={styles.statValue}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Performance Chart */}
      {chartData.length > 0 && (
        <div style={styles.chartCard}>
          <h3 style={styles.sectionTitle}>📈 Performance Trend</h3>
          <p style={styles.chartSubtitle}>Your last {chartData.length} exam scores</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}%`, 'Score']} />
              <Line type="monotone" dataKey="score" stroke="#1E3A5F" strokeWidth={2}
                dot={{ fill: '#1E3A5F', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Achievements */}
      <div style={styles.achievementsCard}>
        <h3 style={styles.sectionTitle}>🏅 Achievements</h3>
        <div style={styles.achievementsGrid}>
          {achievements.map((a, i) => (
            <div key={i} style={{
              ...styles.achievement,
              opacity: a.earned ? 1 : 0.35,
              backgroundColor: a.earned ? '#FFFBEB' : '#F7FAFC',
              border: a.earned ? '1px solid #F6E05E' : '1px solid #EEE'
            }}>
              <div style={styles.achievementIcon}>{a.icon}</div>
              <div style={styles.achievementLabel}>{a.label}</div>
              {a.earned && <div style={styles.earnedBadge}>✓</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Available Exams */}
      <h3 style={{ ...styles.sectionTitle, marginBottom: '16px' }}>📝 Available Exams</h3>
      {exams.length === 0 ? (
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

                {/* Countdown Timer */}
                {exam.status === 'scheduled' && countdown[exam.id] && (
                  <div style={styles.countdown}>
                    <div style={styles.countdownLabel}>⏳ Starts in:</div>
                    <div style={styles.countdownTimer}>
                      {countdown[exam.id].days > 0 && (
                        <span style={styles.countdownUnit}>
                          <span style={styles.countdownNum}>{countdown[exam.id].days}</span>d
                        </span>
                      )}
                      <span style={styles.countdownUnit}>
                        <span style={styles.countdownNum}>{String(countdown[exam.id].hours).padStart(2, '0')}</span>h
                      </span>
                      <span style={styles.countdownUnit}>
                        <span style={styles.countdownNum}>{String(countdown[exam.id].mins).padStart(2, '0')}</span>m
                      </span>
                      <span style={styles.countdownUnit}>
                        <span style={styles.countdownNum}>{String(countdown[exam.id].secs).padStart(2, '0')}</span>s
                      </span>
                    </div>
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
                  exam.status === 'scheduled' ? '⏳ Not Yet' : '🔒 Unavailable'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '1200px', margin: '0 auto' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666', fontSize: '14px' },
  headerBtns: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  leaderboardBtn: { backgroundColor: '#D69E2E', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  resultsBtn: { backgroundColor: 'white', border: '2px solid #1E3A5F', color: '#1E3A5F', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' },
  statCard: { backgroundColor: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  statIcon: { fontSize: '24px', marginBottom: '6px' },
  statValue: { fontSize: '26px', fontWeight: 'bold', color: '#1E3A5F' },
  statLabel: { color: '#666', fontSize: '12px', marginTop: '4px' },
  chartCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  chartSubtitle: { color: '#888', fontSize: '12px', marginBottom: '12px' },
  achievementsCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  achievementsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginTop: '12px' },
  achievement: { borderRadius: '10px', padding: '12px 8px', textAlign: 'center', position: 'relative' },
  achievementIcon: { fontSize: '24px', marginBottom: '6px' },
  achievementLabel: { fontSize: '11px', color: '#555', fontWeight: '600' },
  earnedBadge: { position: 'absolute', top: '6px', right: '6px', backgroundColor: '#38A169', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  sectionTitle: { color: '#1E3A5F', fontSize: '16px', fontWeight: '700', marginBottom: '4px' },
  empty: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  examTitle: { color: '#1E3A5F', fontSize: '15px', flex: 1, marginRight: '8px' },
  badge: { color: 'white', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', flexShrink: 0, fontWeight: 'bold' },
  cardBody: { marginBottom: '14px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: '13px', marginBottom: '6px' },
  countdown: { backgroundColor: '#EBF8FF', borderRadius: '8px', padding: '10px', marginTop: '8px' },
  countdownLabel: { color: '#2A4365', fontSize: '11px', fontWeight: '600', marginBottom: '6px' },
  countdownTimer: { display: 'flex', gap: '8px', justifyContent: 'center' },
  countdownUnit: { color: '#2A4365', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' },
  countdownNum: { backgroundColor: '#1E3A5F', color: 'white', padding: '3px 7px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', minWidth: '26px', textAlign: 'center', display: 'inline-block' },
  startBtn: { width: '100%', padding: '12px', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold' }
};

export default StudentDashboard;