import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import ActivityFeed from '../../components/ActivityFeed';

function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childResults, setChildResults] = useState(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { loadChildren(); }, []);

  const loadChildren = async () => {
    try {
      const res = await API.get('/parent/children');
      setChildren(res.data.children);
      if (res.data.children.length > 0 && !selectedChild) {
        loadChildResults(res.data.children[0]);
      }
    } catch (err) {
      console.error('Failed to load children');
    }
    setLoading(false);
  };

  const loadChildResults = async (child) => {
    setSelectedChild(child);
    setChildResults(null);
    try {
      const res = await API.get(`/parent/child/${child.id}/results`);
      setChildResults(res.data);
    } catch (err) {
      console.error('Failed to load results');
    }
  };

  const handleLink = async (e) => {
    e.preventDefault();
    setLinking(true);
    setError('');
    setSuccess('');
    try {
      const res = await API.post('/parent/link', { student_email: linkEmail });
      setSuccess(res.data.message);
      setLinkEmail('');
      loadChildren();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to link student');
    }
    setLinking(false);
  };

  const handleUnlink = async (student_id) => {
    if (!window.confirm('Unlink this student?')) return;
    try {
      await API.delete(`/parent/unlink/${student_id}`);
      setChildren(children.filter(c => c.id !== student_id));
      if (selectedChild?.id === student_id) {
        setSelectedChild(null);
        setChildResults(null);
      }
    } catch (err) {
      alert('Failed to unlink');
    }
  };

  const handleDownloadPDF = async (child) => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/pdf/child-report/${child.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_card_${child.first_name}_${child.last_name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download report card');
    }
    setDownloading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Parent Portal 👨‍👩‍👧</h1>
          <p style={styles.subtitle}>Welcome, {user.first_name} — Monitor your child's progress</p>
        </div>
      </div>

      <div style={styles.layout}>
        {/* Left Panel */}
        <div style={styles.leftPanel}>
          <div style={styles.panelCard}>
            <h3 style={styles.panelTitle}>My Children</h3>
            {children.length === 0 ? (
              <p style={styles.emptyText}>No children linked yet.</p>
            ) : (
              children.map(child => (
                <div key={child.id}
                  style={{
                    ...styles.childItem,
                    backgroundColor: selectedChild?.id === child.id ? '#EBF8FF' : '#F7FAFC',
                    border: `2px solid ${selectedChild?.id === child.id ? '#3182CE' : 'transparent'}`
                  }}
                  onClick={() => loadChildResults(child)}
                >
                  <div style={styles.childAvatar}>
                    {child.first_name[0]}{child.last_name[0]}
                  </div>
                  <div style={styles.childInfo}>
                    <div style={styles.childName}>{child.first_name} {child.last_name}</div>
                    <div style={styles.childEmail}>{child.email}</div>
                  </div>
                  <button style={styles.unlinkBtn}
                    onClick={e => { e.stopPropagation(); handleUnlink(child.id); }}>✕</button>
                </div>
              ))
            )}

            <div style={styles.linkBox}>
              <h4 style={styles.linkTitle}>+ Link a Child</h4>
              {error && <p style={styles.errorText}>{error}</p>}
              {success && <p style={styles.successText}>{success}</p>}
              <form onSubmit={handleLink}>
                <input style={styles.linkInput} type="email"
                  placeholder="Child's school email"
                  value={linkEmail}
                  onChange={e => setLinkEmail(e.target.value)} required
                />
                <button type="submit" style={styles.linkBtn} disabled={linking}>
                  {linking ? 'Linking...' : 'Link Student'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={styles.rightPanel}>
          {!selectedChild ? (
            <div style={styles.noChild}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍👩‍👧</div>
              <p>Select a child to view their results</p>
            </div>
          ) : !childResults ? (
            <p>Loading results...</p>
          ) : (
            <div>
              {/* Child Header */}
              <div style={styles.childHeader}>
                <div style={styles.childAvatarLg}>
                  {selectedChild.first_name[0]}{selectedChild.last_name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={styles.childFullName}>
                    {selectedChild.first_name} {selectedChild.last_name}
                  </h2>
                  <p style={styles.childEmailLg}>{selectedChild.email}</p>
                </div>
                {/* PDF Download Button */}
                <button
                  style={{
                    ...styles.downloadBtn,
                    opacity: downloading ? 0.7 : 1
                  }}
                  onClick={() => handleDownloadPDF(selectedChild)}
                  disabled={downloading}
                >
                  {downloading ? '⏳ Generating...' : '📄 Download Report Card'}
                </button>
              </div>

              {/* Stats */}
              <div style={styles.statsGrid}>
                {[
                  { label: 'Exams Taken', value: childResults.summary.total, color: '#1E3A5F' },
                  { label: 'Passed', value: childResults.summary.passed, color: '#38A169' },
                  { label: 'Failed', value: childResults.summary.failed, color: '#E53E3E' },
                  { label: 'Average', value: `${childResults.summary.avg_percentage}%`, color: '#3182CE' }
                ].map((s, i) => (
                  <div key={i} style={{...styles.statCard, borderTop: `4px solid ${s.color}`}}>
                    <div style={styles.statValue}>{s.value}</div>
                    <div style={styles.statLabel}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Results */}
              {childResults.results.length === 0 ? (
                <div style={styles.noResults}><p>No exam results yet.</p></div>
              ) : (
                childResults.results.map(r => (
                  <div key={r.id} style={{
                    ...styles.resultCard,
                    borderLeft: `4px solid ${r.passed ? '#38A169' : '#E53E3E'}`
                  }}>
                    <div style={styles.resultTop}>
                      <div>
                        <div style={styles.resultTitle}>{r.exam_title}</div>
                        <div style={styles.resultDate}>
                          📅 {r.submitted_at
                            ? new Date(r.submitted_at).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })
                            : 'N/A'}
                        </div>
                      </div>
                      <div style={styles.resultRight}>
                        <div style={styles.resultPercentage}>{r.percentage}%</div>
                        <span style={{
                          ...styles.resultBadge,
                          backgroundColor: r.passed ? '#C6F6D5' : '#FED7D7',
                          color: r.passed ? '#276749' : '#9B2C2C'
                        }}>
                          {r.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{
                        ...styles.progressFill,
                        width: `${r.percentage}%`,
                        backgroundColor: r.passed ? '#38A169' : '#E53E3E'
                      }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: '16px' }}>
            <ActivityFeed />
          </div>
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '1200px', margin: '0 auto' },
  header: { marginBottom: '24px' },
  title: { color: '#1E3A5F', fontSize: '28px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  layout: { display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' },
  leftPanel: { width: '300px', flexShrink: 0, flex: '1 1 280px', minWidth: '280px' },
  rightPanel: { flex: '2 1 300px', minWidth: '280px' },
  panelCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  panelTitle: { color: '#1E3A5F', marginBottom: '16px', fontSize: '16px' },
  emptyText: { color: '#888', fontSize: '14px', textAlign: 'center', padding: '16px 0' },
  childItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px' },
  childAvatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1E3A5F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', flexShrink: 0 },
  childInfo: { flex: 1 },
  childName: { fontWeight: 'bold', color: '#333', fontSize: '14px' },
  childEmail: { color: '#888', fontSize: '12px' },
  unlinkBtn: { background: 'none', border: 'none', color: '#E53E3E', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' },
  linkBox: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #EEE' },
  linkTitle: { color: '#1E3A5F', marginBottom: '10px', fontSize: '14px' },
  errorText: { color: '#E53E3E', fontSize: '13px', marginBottom: '8px' },
  successText: { color: '#38A169', fontSize: '13px', marginBottom: '8px' },
  linkInput: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DDD', fontSize: '16px', boxSizing: 'border-box', marginBottom: '8px' },
  linkBtn: { width: '100%', padding: '12px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px' },
  noChild: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  childHeader: { display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flexWrap: 'wrap' },
  childAvatarLg: { width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#1E3A5F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '20px', flexShrink: 0 },
  childFullName: { color: '#1E3A5F', fontSize: '20px', marginBottom: '4px' },
  childEmailLg: { color: '#666', fontSize: '14px' },
  downloadBtn: { backgroundColor: '#1E3A5F', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginBottom: '16px' },
  statCard: { backgroundColor: 'white', borderRadius: '10px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' },
  statValue: { fontSize: '28px', fontWeight: 'bold', color: '#1E3A5F' },
  statLabel: { color: '#666', fontSize: '12px', marginTop: '4px' },
  noResults: { textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  resultCard: { backgroundColor: 'white', borderRadius: '10px', padding: '16px', marginBottom: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' },
  resultTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' },
  resultTitle: { fontWeight: 'bold', color: '#1E3A5F', fontSize: '15px', marginBottom: '4px' },
  resultDate: { color: '#888', fontSize: '13px' },
  resultRight: { textAlign: 'right', marginLeft: '8px' },
  resultPercentage: { fontSize: '24px', fontWeight: 'bold', color: '#1E3A5F' },
  resultBadge: { padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
  progressBar: { backgroundColor: '#EEE', borderRadius: '4px', height: '6px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '4px' }
};

export default ParentDashboard;