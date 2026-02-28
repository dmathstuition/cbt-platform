import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

function Leaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
    loadLeaderboard('all');
  }, []);

  const loadClasses = async () => {
    try {
      const res = await API.get('/classes');
      setClasses(res.data.classes || []);
    } catch (err) {}
  };

  const loadLeaderboard = async (classId) => {
    setLoading(true);
    try {
      const endpoint = classId && classId !== 'all'
        ? `/leaderboard/overall?class_id=${classId}`
        : '/leaderboard/overall';
      const res = await API.get(endpoint);
      setLeaderboard(res.data.leaderboard);
    } catch (err) {
      console.error('Failed to load leaderboard');
    }
    setLoading(false);
  };

  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    loadLeaderboard(classId);
  };

  const getMedal = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const myRank = leaderboard.findIndex(s => s.id === user.id);
  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || 'All Classes';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🏆 Leaderboard</h1>
          <p style={styles.subtitle}>Top students in your school</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/student/dashboard')}>
          ← Dashboard
        </button>
      </div>

      {/* Class Filter */}
      <div style={styles.filterRow}>
        <span style={styles.filterLabel}>Filter by Class:</span>
        <div style={styles.filterBtns}>
          <button
            style={{
              ...styles.filterBtn,
              backgroundColor: selectedClass === 'all' ? '#1E3A5F' : 'white',
              color: selectedClass === 'all' ? 'white' : '#333'
            }}
            onClick={() => handleClassChange('all')}
          >
            🏫 All Classes
          </button>
          {classes.map(c => (
            <button
              key={c.id}
              style={{
                ...styles.filterBtn,
                backgroundColor: selectedClass === c.id ? '#1E3A5F' : 'white',
                color: selectedClass === c.id ? 'white' : '#333'
              }}
              onClick={() => handleClassChange(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* My Rank Card */}
      {myRank !== -1 && (
        <div style={styles.myRankCard}>
          <div style={styles.myRankLeft}>
            <span style={styles.myRankBadge}>{getMedal(myRank)}</span>
            <div>
              <div style={styles.myRankName}>Your Ranking</div>
              <div style={styles.myRankSub}>
                Position {myRank + 1} of {leaderboard.length} students
                {selectedClass !== 'all' && ` in ${selectedClassName}`}
              </div>
            </div>
          </div>
          <div style={styles.myRankRight}>
            <div style={styles.myRankScore}>{leaderboard[myRank]?.avg_percentage}%</div>
            <div style={styles.myRankLabel}>Average Score</div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={styles.empty}><p>Loading leaderboard...</p></div>
      ) : leaderboard.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
          <p>No results yet for {selectedClass === 'all' ? 'this school' : selectedClassName}.</p>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          {/* Header */}
          <div style={styles.tableHeader}>
            <span style={styles.rankCol}>Rank</span>
            <span style={styles.nameCol}>Student</span>
            <span style={styles.numCol}>Exams</span>
            <span style={styles.numCol}>Passed</span>
            <span style={styles.numCol}>Avg Score</span>
            <span style={styles.numCol}>Best</span>
          </div>

          {/* Rows */}
          {leaderboard.map((student, index) => {
            const isMe = student.id === user.id;
            return (
              <div key={student.id} style={{
                ...styles.tableRow,
                backgroundColor: isMe ? '#EBF8FF' : index % 2 === 0 ? 'white' : '#F7FAFC',
                border: isMe ? '2px solid #3182CE' : '2px solid transparent'
              }}>
                <span style={styles.rankCol}>
                  <span style={{
                    ...styles.rankBadge,
                    backgroundColor: index === 0 ? '#FFD700' :
                      index === 1 ? '#C0C0C0' :
                      index === 2 ? '#CD7F32' : '#EEE',
                    color: index < 3 ? 'white' : '#333'
                  }}>
                    {getMedal(index)}
                  </span>
                </span>
                <span style={styles.nameCol}>
                  <span style={styles.studentName}>
                    {student.name}
                    {isMe && <span style={styles.youBadge}>YOU</span>}
                  </span>
                  {student.class_name && (
                    <div style={styles.classTag}>🏫 {student.class_name}</div>
                  )}
                </span>
                <span style={styles.numCol}>{student.exams_taken}</span>
                <span style={styles.numCol}>{student.exams_passed}</span>
                <span style={{ ...styles.numCol, fontWeight: 'bold', color: '#1E3A5F' }}>
                  {student.avg_percentage}%
                </span>
                <span style={{ ...styles.numCol, color: '#38A169' }}>
                  {student.highest_score}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' },
  filterRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  filterLabel: { color: '#555', fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap' },
  filterBtns: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  filterBtn: { padding: '8px 16px', border: '1px solid #DDD', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  myRankCard: { backgroundColor: '#1E3A5F', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' },
  myRankLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  myRankBadge: { fontSize: '36px' },
  myRankName: { color: 'white', fontWeight: 'bold', fontSize: '16px' },
  myRankSub: { color: '#93C5FD', fontSize: '13px' },
  myRankRight: { textAlign: 'right' },
  myRankScore: { color: 'white', fontSize: '32px', fontWeight: 'bold' },
  myRankLabel: { color: '#93C5FD', fontSize: '13px' },
  empty: { textAlign: 'center', padding: '48px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  tableWrap: { backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  tableHeader: { display: 'flex', alignItems: 'center', padding: '14px 20px', backgroundColor: '#1E3A5F', color: 'white', fontSize: '13px', fontWeight: 'bold' },
  tableRow: { display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #F0F0F0' },
  rankCol: { width: '70px', flexShrink: 0 },
  nameCol: { flex: 1 },
  numCol: { width: '80px', textAlign: 'center', flexShrink: 0, fontSize: '14px' },
  rankBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', fontSize: '13px', fontWeight: 'bold' },
  studentName: { color: '#333', fontSize: '14px', fontWeight: '600' },
  classTag: { color: '#888', fontSize: '11px', marginTop: '2px' },
  youBadge: { backgroundColor: '#3182CE', color: 'white', padding: '1px 7px', borderRadius: '10px', fontSize: '10px', marginLeft: '8px', fontWeight: '700' }
};

export default Leaderboard;