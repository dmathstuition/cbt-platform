import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../services/api';

function MissingStudents() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await API.get(`/exams/${id}/missing-students`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load');
    }
    setLoading(false);
  };

  const handleNotifyAll = async () => {
    if (!window.confirm(`Send reminder notification to all ${data.missing.length} students who haven't started?`)) return;
    setSending(true);
    try {
      await API.post('/notifications/send', {
        title: `📝 Reminder: ${data.exam.title}`,
        message: `You have not yet started the exam "${data.exam.title}". Please log in and complete it before the deadline.`,
        type: 'warning',
        roles: ['student']
      });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      alert('Failed to send notifications');
    }
    setSending(false);
  };

  const filtered = data?.missing.filter(s =>
    `${s.first_name} ${s.last_name} ${s.email}`
      .toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (loading) return <div style={styles.center}><p>Loading...</p></div>;
  if (!data) return <div style={styles.center}><p>Failed to load data.</p></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👥 Student Completion Status</h1>
          <p style={styles.subtitle}>{data.exam.title}</p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.backBtn} onClick={() => navigate('/teacher/dashboard')}>
            ← Dashboard
          </button>
          <button style={styles.resultsBtn}
            onClick={() => navigate(`/teacher/exam/${id}/results`)}>
            📊 View Results
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={{ ...styles.statBox, borderTop: '4px solid #1E3A5F' }}>
          <div style={styles.statVal}>{data.total_students}</div>
          <div style={styles.statLbl}>Total Students</div>
        </div>
        <div style={{ ...styles.statBox, borderTop: '4px solid #38A169' }}>
          <div style={styles.statVal}>{data.submitted}</div>
          <div style={styles.statLbl}>Submitted</div>
        </div>
        <div style={{ ...styles.statBox, borderTop: '4px solid #D69E2E' }}>
          <div style={styles.statVal}>{data.in_progress}</div>
          <div style={styles.statLbl}>In Progress</div>
        </div>
        <div style={{ ...styles.statBox, borderTop: '4px solid #E53E3E' }}>
          <div style={styles.statVal}>{data.not_started}</div>
          <div style={styles.statLbl}>Not Started</div>
        </div>
        <div style={{ ...styles.statBox, borderTop: '4px solid #805AD5' }}>
          <div style={styles.statVal}>
            {data.total_students > 0
              ? Math.round((data.submitted / data.total_students) * 100)
              : 0}%
          </div>
          <div style={styles.statLbl}>Completion</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressWrap}>
        <div style={styles.progressBg}>
          <div style={{
            ...styles.progressFill,
            width: `${data.total_students > 0 ? (data.submitted / data.total_students) * 100 : 0}%`
          }} />
        </div>
        <span style={styles.progressLabel}>
          {data.submitted}/{data.total_students} students completed
        </span>
      </div>

      {/* Missing Students */}
      {data.missing.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              ⚠️ Haven't Started ({data.missing.length})
            </h2>
            <div style={styles.sectionActions}>
              <input
                style={styles.searchInput}
                placeholder="🔍 Search students..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button
                style={{
                  ...styles.notifyBtn,
                  opacity: sending ? 0.7 : 1
                }}
                onClick={handleNotifyAll}
                disabled={sending}
              >
                {sending ? 'Sending...' : sent ? '✅ Sent!' : '🔔 Notify All'}
              </button>
            </div>
          </div>

          <div style={styles.studentList}>
            {filtered.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
                No students match your search
              </p>
            ) : (
              filtered.map((s, i) => (
                <div key={s.id} style={styles.studentItem}>
                  <div style={styles.studentAvatar}>
                    {s.first_name[0]}{s.last_name[0]}
                  </div>
                  <div style={styles.studentInfo}>
                    <div style={styles.studentName}>
                      {s.first_name} {s.last_name}
                    </div>
                    <div style={styles.studentEmail}>{s.email}</div>
                  </div>
                  <span style={styles.notStartedBadge}>Not Started</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {data.missing.length === 0 && (
        <div style={styles.allDone}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
          <h2 style={{ color: '#38A169' }}>All students have started!</h2>
          <p style={{ color: '#666' }}>
            {data.submitted} submitted, {data.in_progress} in progress
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '900px', margin: '0 auto' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  headerBtns: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  resultsBtn: { backgroundColor: '#805AD5', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  statsRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  statBox: { backgroundColor: 'white', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flex: 1, minWidth: '100px', textAlign: 'center' },
  statVal: { fontSize: '28px', fontWeight: '700', color: '#1E3A5F' },
  statLbl: { color: '#666', fontSize: '12px', marginTop: '4px' },
  progressWrap: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
  progressBg: { flex: 1, minWidth: '200px', backgroundColor: '#EEE', borderRadius: '6px', height: '10px', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#38A169', borderRadius: '6px', transition: 'width 0.5s' },
  progressLabel: { color: '#666', fontSize: '13px', whiteSpace: 'nowrap' },
  section: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
  sectionTitle: { color: '#1E3A5F', fontSize: '16px', fontWeight: '700', margin: 0 },
  sectionActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  searchInput: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '14px', minWidth: '180px' },
  notifyBtn: { backgroundColor: '#E53E3E', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  studentList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  studentItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: '#FFF5F5', borderRadius: '8px', border: '1px solid #FED7D7' },
  studentAvatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#E53E3E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', flexShrink: 0 },
  studentInfo: { flex: 1 },
  studentName: { fontWeight: '600', color: '#333', fontSize: '14px' },
  studentEmail: { color: '#888', fontSize: '12px' },
  notStartedBadge: { backgroundColor: '#FED7D7', color: '#9B2C2C', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', flexShrink: 0 },
  allDone: { backgroundColor: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
};

export default MissingStudents;