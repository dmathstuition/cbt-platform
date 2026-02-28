import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';

function Results() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/pdf/report-card', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'report_card.pdf';
      a.click();
    } catch (err) {
      alert('Failed to download report card');
    }
  };

  useEffect(() => { loadResults(); }, []);

  const loadResults = async () => {
    try {
      const res = await API.get('/sessions/my-results');
      setResults(res.data.results);
    } catch (err) {
      console.error('Failed to load results');
    }
    setLoading(false);
  };

  const totalExams = results.length;
  const passed = results.filter(r => r.passed).length;
  const avgPercentage = totalExams > 0
    ? (results.reduce((sum, r) => sum + parseFloat(r.percentage || 0), 0) / totalExams).toFixed(1)
    : 0;
  const highestScore = totalExams > 0
    ? Math.max(...results.map(r => parseFloat(r.percentage || 0))).toFixed(1)
    : 0;

  if (loading) return <div style={styles.center}><p>Loading results...</p></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>My Results 📊</h1>
          <p style={styles.subtitle}>Your complete exam history</p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.downloadBtn} onClick={handleDownload}>
            📄 Report Card
          </button>
          <button style={styles.backBtn} onClick={() => navigate('/student/dashboard')}>
            ← Dashboard
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={styles.summaryGrid}>
        {[
          { label: 'Exams Taken', value: totalExams, color: '#1E3A5F' },
          { label: 'Passed', value: passed, color: '#38A169' },
          { label: 'Failed', value: totalExams - passed, color: '#E53E3E' },
          { label: 'Average', value: `${avgPercentage}%`, color: '#3182CE' },
          { label: 'Highest', value: `${highestScore}%`, color: '#D69E2E' }
        ].map((s, i) => (
          <div key={i} style={{...styles.summaryCard, borderTop: `4px solid ${s.color}`}}>
            <div style={styles.summaryValue}>{s.value}</div>
            <div style={styles.summaryLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {results.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <p>You haven't taken any exams yet.</p>
          <button style={styles.btn} onClick={() => navigate('/student/dashboard')}>
            Go Take an Exam
          </button>
        </div>
      ) : (
        <div>
          {results.map(r => (
            <div key={r.id} style={{
              ...styles.resultCard,
              borderLeft: `4px solid ${r.passed ? '#38A169' : '#E53E3E'}`
            }}>
              {/* Top Row */}
              <div style={styles.resultTop}
                onClick={() => setSelected(selected?.id === r.id ? null : r)}>
                <div style={styles.resultLeft}>
                  <div style={styles.resultTitle}>{r.exam_title}</div>
                  <div style={styles.resultMeta}>
                    📅 {r.submitted_at
                      ? new Date(r.submitted_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })
                      : 'N/A'}
                    &nbsp;·&nbsp; ⏱ {r.duration_minutes} mins
                    &nbsp;·&nbsp; 📝 {r.type}
                  </div>
                </div>
                <div style={styles.resultRight}>
                  <div style={styles.percentage}>{r.percentage}%</div>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: r.passed ? '#C6F6D5' : '#FED7D7',
                    color: r.passed ? '#276749' : '#9B2C2C'
                  }}>
                    {r.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={styles.barBg}>
                <div style={{
                  ...styles.barFill,
                  width: `${r.percentage}%`,
                  backgroundColor: r.passed ? '#38A169' : '#E53E3E'
                }} />
              </div>

              {/* Action Buttons */}
              <div style={styles.actionRow}>
                <button
                  style={styles.reviewBtn}
                  onClick={() => navigate(`/student/review/${r.id}`)}
                >
                  🔍 Review Answers
                </button>
                <button
                  style={styles.toggleBtn}
                  onClick={() => setSelected(selected?.id === r.id ? null : r)}
                >
                  {selected?.id === r.id ? '▲ Hide Details' : '▼ Show Details'}
                </button>
              </div>

              {/* Expanded Details */}
              {selected?.id === r.id && (
                <div style={styles.detail}>
                  <div style={styles.detailGrid}>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Score</span>
                      <span style={styles.detailValue}>{r.score} / {r.total_marks}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Pass Mark</span>
                      <span style={styles.detailValue}>{r.pass_mark}%</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Percentage</span>
                      <span style={styles.detailValue}>{r.percentage}%</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Status</span>
                      <span style={{
                        ...styles.detailValue,
                        color: r.passed ? '#38A169' : '#E53E3E'
                      }}>
                        {r.passed ? '✅ Passed' : '❌ Failed'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
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
  downloadBtn: { backgroundColor: '#1E3A5F', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' },
  summaryCard: { backgroundColor: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  summaryValue: { fontSize: '28px', fontWeight: 'bold', color: '#1E3A5F' },
  summaryLabel: { color: '#666', fontSize: '12px', marginTop: '4px' },
  empty: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  btn: { backgroundColor: '#1E3A5F', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', marginTop: '16px' },
  resultCard: { backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  resultTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', cursor: 'pointer' },
  resultLeft: { flex: 1 },
  resultTitle: { fontWeight: 'bold', color: '#1E3A5F', fontSize: '15px', marginBottom: '4px' },
  resultMeta: { color: '#888', fontSize: '12px' },
  resultRight: { textAlign: 'right', marginLeft: '12px' },
  percentage: { fontSize: '26px', fontWeight: 'bold', color: '#1E3A5F' },
  badge: { padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' },
  barBg: { backgroundColor: '#EEE', borderRadius: '4px', height: '6px', overflow: 'hidden', marginBottom: '12px' },
  barFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s' },
  actionRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  reviewBtn: { backgroundColor: '#3182CE', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  toggleBtn: { backgroundColor: '#F7FAFC', color: '#333', border: '1px solid #DDD', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  detail: { marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #EEE' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '16px' },
  detailItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  detailLabel: { color: '#888', fontSize: '12px', marginBottom: '4px' },
  detailValue: { fontWeight: 'bold', color: '#1E3A5F', fontSize: '15px' }
};

export default Results;