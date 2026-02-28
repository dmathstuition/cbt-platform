import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';

function ManageExams() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const res = await API.get('/admin/results');
      setResults(res.data.results);
    } catch (err) {
      console.error('Failed to load results');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Exam Results</h1>
          <p style={styles.subtitle}>{results.length} submissions found</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/admin/dashboard')}>
          ← Back to Dashboard
        </button>
      </div>

      {loading ? (
        <p>Loading results...</p>
      ) : results.length === 0 ? (
        <div style={styles.empty}>No exam submissions yet.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHead}>
                <th style={styles.th}>Student</th>
                <th style={styles.th}>Exam</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Percentage</th>
                <th style={styles.th}>Result</th>
                <th style={styles.th}>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => {
                const percentage = r.total_marks > 0
                  ? ((r.score / r.total_marks) * 100).toFixed(1)
                  : 0;
                return (
                  <tr key={r.id} style={styles.tableRow}>
                    <td style={styles.td}>
                      <div style={styles.studentName}>{r.student_name}</div>
                      <div style={styles.studentEmail}>{r.student_email}</div>
                    </td>
                    <td style={styles.td}>{r.exam_title}</td>
                    <td style={styles.td}>
                      {r.score} / {r.total_marks}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.percentBar}>
                        <div style={{
                          ...styles.percentFill,
                          width: `${percentage}%`,
                          backgroundColor: percentage >= r.pass_mark ? '#38A169' : '#E53E3E'
                        }} />
                        <span style={styles.percentText}>{percentage}%</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.resultBadge,
                        backgroundColor: r.passed ? '#C6F6D5' : '#FED7D7',
                        color: r.passed ? '#276749' : '#9B2C2C'
                      }}>
                        {r.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {r.submitted_at
                        ? new Date(r.submitted_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '24px'
  },
  title: { color: '#1E3A5F', fontSize: '28px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  backBtn: {
    backgroundColor: 'white', border: '1px solid #DDD',
    padding: '10px 20px', borderRadius: '8px', cursor: 'pointer'
  },
  empty: {
    textAlign: 'center', padding: '60px',
    backgroundColor: 'white', borderRadius: '12px', color: '#666'
  },
  tableWrapper: {
    backgroundColor: 'white', borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden'
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { backgroundColor: '#F7FAFC' },
  th: {
    padding: '14px 16px', textAlign: 'left',
    color: '#444', fontWeight: '600',
    borderBottom: '1px solid #EEE', fontSize: '14px'
  },
  tableRow: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#333' },
  studentName: { fontWeight: '500', color: '#1E3A5F' },
  studentEmail: { color: '#888', fontSize: '12px' },
  percentBar: {
    backgroundColor: '#EEE', borderRadius: '4px',
    height: '8px', position: 'relative', width: '100px'
  },
  percentFill: {
    height: '100%', borderRadius: '4px',
    transition: 'width 0.3s'
  },
  percentText: {
    position: 'absolute', right: '-35px',
    top: '-4px', fontSize: '12px', color: '#555'
  },
  resultBadge: {
    padding: '4px 12px', borderRadius: '12px',
    fontSize: '12px', fontWeight: 'bold'
  }
};

export default ManageExams;