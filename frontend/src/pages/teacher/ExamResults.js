import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../services/api';

function ExamResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadResults(); }, []);
  
  const loadResults = async () => {
    try {
      const res = await API.get(`/exams/${id}/results`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load results');
    }
    setLoading(false);
  };

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/pdf/exam-results/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam_results_${data?.exam?.title || 'report'}.pdf`;
      a.click();
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  if (loading) return <div style={styles.center}><p>Loading results...</p></div>;
  if (!data) return <div style={styles.center}><p>No data found.</p></div>;

  const { exam, results, analytics } = data;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{exam.title}</h1>
          <p style={styles.subtitle}>Exam Results & Analytics</p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.pdfBtn} onClick={handleDownloadPDF}>
            📄 Export PDF
          </button>
          <button style={styles.backBtn} onClick={() => navigate('/teacher/dashboard')}>
            ← Dashboard
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div style={styles.analyticsGrid}>
        <div style={{...styles.analyticsCard, borderTop: '4px solid #1E3A5F'}}>
          <div style={styles.analyticsValue}>{analytics.total}</div>
          <div style={styles.analyticsLabel}>Total Submissions</div>
        </div>
        <div style={{...styles.analyticsCard, borderTop: '4px solid #38A169'}}>
          <div style={styles.analyticsValue}>{analytics.passed}</div>
          <div style={styles.analyticsLabel}>Passed</div>
        </div>
        <div style={{...styles.analyticsCard, borderTop: '4px solid #E53E3E'}}>
          <div style={styles.analyticsValue}>{analytics.failed}</div>
          <div style={styles.analyticsLabel}>Failed</div>
        </div>
        <div style={{...styles.analyticsCard, borderTop: '4px solid #3182CE'}}>
          <div style={styles.analyticsValue}>{analytics.passRate}%</div>
          <div style={styles.analyticsLabel}>Pass Rate</div>
        </div>
        <div style={{...styles.analyticsCard, borderTop: '4px solid #D69E2E'}}>
          <div style={styles.analyticsValue}>{analytics.avg}%</div>
          <div style={styles.analyticsLabel}>Average Score</div>
        </div>
        <div style={{...styles.analyticsCard, borderTop: '4px solid #38A169'}}>
          <div style={styles.analyticsValue}>{analytics.highest}%</div>
          <div style={styles.analyticsLabel}>Highest Score</div>
        </div>
        <div style={{...styles.analyticsCard, borderTop: '4px solid #E53E3E'}}>
          <div style={styles.analyticsValue}>{analytics.lowest}%</div>
          <div style={styles.analyticsLabel}>Lowest Score</div>
        </div>
      </div>

      {/* Pass Rate Bar */}
      <div style={styles.passRateBox}>
        <div style={styles.passRateLabel}>
          <span>Pass Rate</span>
          <span>{analytics.passRate}%</span>
        </div>
        <div style={styles.passRateBar}>
          <div style={{
            ...styles.passRateFill,
            width: `${analytics.passRate}%`,
            backgroundColor: analytics.passRate >= 70 ? '#38A169' :
              analytics.passRate >= 50 ? '#D69E2E' : '#E53E3E'
          }} />
        </div>
      </div>

      {/* Results Table */}
      {results.length === 0 ? (
        <div style={styles.empty}>
          <p>No submissions yet for this exam.</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHead}>
                <th style={styles.th}>Rank</th>
                <th style={styles.th}>Student</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Percentage</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, index) => (
                <tr key={r.id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.rankBadge,
                      backgroundColor: index === 0 ? '#FFD700' :
                        index === 1 ? '#C0C0C0' :
                        index === 2 ? '#CD7F32' : '#EEE',
                      color: index < 3 ? 'white' : '#333'
                    }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.studentName}>{r.student_name}</div>
                    <div style={styles.studentEmail}>{r.student_email}</div>
                  </td>
                  <td style={styles.td}>{r.score}/{r.total_marks}</td>
                  <td style={styles.td}>
                    <div style={styles.percentBar}>
                      <div style={{
                        ...styles.percentFill,
                        width: `${r.percentage}%`,
                        backgroundColor: r.passed ? '#38A169' : '#E53E3E'
                      }} />
                    </div>
                    <span style={styles.percentText}>{r.percentage}%</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: r.passed ? '#C6F6D5' : '#FED7D7',
                      color: r.passed ? '#276749' : '#9B2C2C'
                    }}>
                      {r.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {r.submitted_at
                      ? new Date(r.submitted_at).toLocaleDateString('en-GB')
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { color: '#1E3A5F', fontSize: '28px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  headerBtns: { display: 'flex', gap: '10px' },
  pdfBtn: { backgroundColor: '#1E3A5F', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  analyticsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' },
  analyticsCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  analyticsValue: { fontSize: '28px', fontWeight: 'bold', color: '#1E3A5F' },
  analyticsLabel: { color: '#666', fontSize: '13px', marginTop: '4px' },
  passRateBox: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  passRateLabel: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 'bold', color: '#1E3A5F' },
  passRateBar: { backgroundColor: '#EEE', borderRadius: '8px', height: '16px', overflow: 'hidden' },
  passRateFill: { height: '100%', borderRadius: '8px', transition: 'width 0.5s' },
  empty: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  tableWrapper: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { backgroundColor: '#1E3A5F' },
  th: { padding: '14px 16px', textAlign: 'left', color: 'white', fontWeight: '600', fontSize: '14px' },
  tableRow: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#333' },
  rankBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', fontSize: '13px', fontWeight: 'bold' },
  studentName: { fontWeight: '500', color: '#1E3A5F' },
  studentEmail: { color: '#888', fontSize: '12px' },
  percentBar: { backgroundColor: '#EEE', borderRadius: '4px', height: '6px', width: '80px', display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' },
  percentFill: { height: '100%', borderRadius: '4px' },
  percentText: { fontSize: '13px', fontWeight: 'bold' },
  statusBadge: { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }
};

export default ExamResults;