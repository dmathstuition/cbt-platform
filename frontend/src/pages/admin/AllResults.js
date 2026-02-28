import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';

function AllResults() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => { loadResults(); }, []);

  useEffect(() => {
    let data = results;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        r.student_name.toLowerCase().includes(q) ||
        r.exam_title.toLowerCase().includes(q) ||
        r.student_email.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') {
      data = data.filter(r => filterStatus === 'passed' ? r.passed : !r.passed);
    }
    setFiltered(data);
  }, [search, filterStatus, results]);

  const loadResults = async () => {
    try {
      const res = await API.get('/admin/results');
      setResults(res.data.results);
      setFiltered(res.data.results);
    } catch (err) {
      console.error('Failed to load results');
    }
    setLoading(false);
  };

  const total = filtered.length;
  const passed = filtered.filter(r => r.passed).length;
  const failed = total - passed;
  const avg = total > 0
    ? (filtered.reduce((sum, r) => sum + parseFloat(r.score || 0), 0) / total).toFixed(1)
    : 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>All Exam Results 📊</h1>
          <p style={styles.subtitle}>{total} results found</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/admin/dashboard')}>
          ← Dashboard
        </button>
      </div>

      {/* Summary Stats */}
      <div style={styles.statsGrid}>
        <div style={{...styles.statCard, borderTop: '4px solid #1E3A5F'}}>
          <div style={styles.statValue}>{total}</div>
          <div style={styles.statLabel}>Total Submissions</div>
        </div>
        <div style={{...styles.statCard, borderTop: '4px solid #38A169'}}>
          <div style={styles.statValue}>{passed}</div>
          <div style={styles.statLabel}>Passed</div>
        </div>
        <div style={{...styles.statCard, borderTop: '4px solid #E53E3E'}}>
          <div style={styles.statValue}>{failed}</div>
          <div style={styles.statLabel}>Failed</div>
        </div>
        <div style={{...styles.statCard, borderTop: '4px solid #3182CE'}}>
          <div style={styles.statValue}>
            {total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%
          </div>
          <div style={styles.statLabel}>Pass Rate</div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filterRow}>
        <input
          style={styles.searchInput}
          placeholder="🔍 Search by student name, email or exam..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={styles.filterBtns}>
          {['all', 'passed', 'failed'].map(f => (
            <button key={f}
              style={{
                ...styles.filterBtn,
                backgroundColor: filterStatus === f ? '#1E3A5F' : 'white',
                color: filterStatus === f ? 'white' : '#333'
              }}
              onClick={() => setFilterStatus(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      {loading ? (
        <p>Loading results...</p>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <p>No results found.</p>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Student</th>
                  <th style={styles.th}>Exam</th>
                  <th style={styles.th}>Score</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{
                    ...styles.tableRow,
                    backgroundColor: i % 2 === 0 ? 'white' : '#F7FAFC'
                  }}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={styles.td}>
                      <div style={styles.studentName}>{r.student_name}</div>
                      <div style={styles.studentEmail}>{r.student_email}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.examTitle}>{r.exam_title}</div>
                      <div style={styles.examMeta}>
                        {r.total_marks} marks · Pass: {r.pass_mark}%
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.scoreWrap}>
                        <div style={styles.scoreBar}>
                          <div style={{
                            ...styles.scoreFill,
                            width: `${(r.score / r.total_marks) * 100}%`,
                            backgroundColor: r.passed ? '#38A169' : '#E53E3E'
                          }} />
                        </div>
                        <span style={styles.scoreText}>
                          {r.score}/{r.total_marks}
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
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
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' },
  statCard: { backgroundColor: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  statValue: { fontSize: '28px', fontWeight: 'bold', color: '#1E3A5F' },
  statLabel: { color: '#666', fontSize: '12px', marginTop: '4px' },
  filterRow: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  searchInput: { flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '14px' },
  filterBtns: { display: 'flex', gap: '8px' },
  filterBtn: { padding: '10px 16px', border: '1px solid #DDD', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  empty: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  tableWrap: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '600px' },
  tableHead: { backgroundColor: '#1E3A5F' },
  th: { padding: '13px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' },
  tableRow: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#333' },
  studentName: { fontWeight: '600', color: '#1E3A5F', fontSize: '14px' },
  studentEmail: { color: '#888', fontSize: '12px' },
  examTitle: { fontWeight: '500', color: '#333' },
  examMeta: { color: '#888', fontSize: '12px' },
  scoreWrap: { display: 'flex', alignItems: 'center', gap: '8px' },
  scoreBar: { backgroundColor: '#EEE', borderRadius: '4px', height: '6px', width: '60px', flexShrink: 0 },
  scoreFill: { height: '100%', borderRadius: '4px' },
  scoreText: { fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' },
  badge: { padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }
};

export default AllResults;