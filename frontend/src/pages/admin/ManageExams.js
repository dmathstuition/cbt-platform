import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';

function ManageExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selected, setSelected] = useState([]);
  const [actionMsg, setActionMsg] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => { loadExams(); }, []);

  const loadExams = async () => {
    try {
      const res = await API.get('/admin/exams');
      setExams(res.data.exams || []);
    } catch (err) {
      setError('Failed to load exams');
    }
    setLoading(false);
  };

  const handleStatusChange = async (examId, newStatus) => {
    try {
      await API.patch(`/admin/exams/${examId}/status`, { status: newStatus });
      setActionMsg(`Exam status updated to ${newStatus}`);
      loadExams();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (examId, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/admin/exams/${examId}`);
      setActionMsg('Exam deleted successfully');
      loadExams();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete exam');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.length} exam(s)? This cannot be undone.`)) return;
    try {
      await Promise.all(selected.map(id => API.delete(`/admin/exams/${id}`)));
      setActionMsg(`${selected.length} exam(s) deleted`);
      setSelected([]);
      loadExams();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setError('Failed to delete some exams');
      setTimeout(() => setError(''), 3000);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelected(filtered.length === selected.length ? [] : filtered.map(e => e.id));
  };

  const filtered = exams.filter(e => {
    const matchSearch = e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.created_by_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    const matchType = filterType === 'all' || e.type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const stats = {
    total: exams.length,
    active: exams.filter(e => e.status === 'active').length,
    draft: exams.filter(e => e.status === 'draft').length,
    scheduled: exams.filter(e => e.status === 'scheduled').length,
    completed: exams.filter(e => e.status === 'completed').length,
  };

  const statusColors = {
    active: { bg: '#C6F6D5', color: '#276749' },
    draft: { bg: '#EDF2F7', color: '#4A5568' },
    scheduled: { bg: '#BEE3F8', color: '#2A4365' },
    completed: { bg: '#E9D8FD', color: '#44337A' },
    archived: { bg: '#FED7D7', color: '#9B2C2C' }
  };

  const statusOptions = ['draft', 'active', 'scheduled', 'completed', 'archived'];

  if (loading) return <div style={styles.center}><p>Loading exams...</p></div>;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📋 Manage Exams</h1>
          <p style={styles.subtitle}>{exams.length} exams in the system</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/admin/dashboard')}>
          ← Dashboard
        </button>
      </div>

      {/* Messages */}
      {actionMsg && <div style={styles.successMsg}>✅ {actionMsg}</div>}
      {error && <div style={styles.errorMsg}>❌ {error}</div>}

      {/* Stats */}
      <div style={styles.statsGrid}>
        {[
          { label: 'Total', value: stats.total, color: '#1E3A5F' },
          { label: 'Active', value: stats.active, color: '#38A169' },
          { label: 'Scheduled', value: stats.scheduled, color: '#3182CE' },
          { label: 'Draft', value: stats.draft, color: '#718096' },
          { label: 'Completed', value: stats.completed, color: '#805AD5' },
        ].map((s, i) => (
          <div key={i} style={{ ...styles.statCard, borderTop: `4px solid ${s.color}` }}>
            <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={styles.filtersRow}>
        <input style={styles.searchInput}
          placeholder="🔍 Search exams or teacher..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select style={styles.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={styles.select} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="mcq">MCQ</option>
          <option value="true_false">True/False</option>
          <option value="fill_blank">Fill in Blank</option>
          <option value="short_answer">Short Answer</option>
          <option value="essay">Essay</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div style={styles.bulkBar}>
          <span style={{ color: 'white', fontWeight: '700' }}>
            {selected.length} exam(s) selected
          </span>
          <button style={styles.bulkDeleteBtn} onClick={handleBulkDelete}>
            🗑️ Delete Selected
          </button>
          <button style={styles.clearBtn} onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <p>No exams found.</p>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>
                    <input type="checkbox"
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onChange={selectAll}
                    />
                  </th>
                  <th style={styles.th}>Exam</th>
                  <th style={styles.th}>Teacher</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Questions</th>
                  <th style={styles.th}>Duration</th>
                  <th style={styles.th}>Submissions</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(exam => (
                  <tr key={exam.id} style={{
                    ...styles.tr,
                    backgroundColor: selected.includes(exam.id) ? '#EBF8FF' : 'white'
                  }}>
                    <td style={styles.td}>
                      <input type="checkbox"
                        checked={selected.includes(exam.id)}
                        onChange={() => toggleSelect(exam.id)}
                      />
                    </td>
                    <td style={styles.td}>
                      <div style={styles.examTitle}>{exam.title}</div>
                      <div style={styles.examMeta}>Pass: {exam.pass_mark}% · {exam.total_marks} marks</div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.teacherName}>{exam.created_by_name || 'Unknown'}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.typeBadge}>{exam.type || 'mcq'}</span>
                    </td>
                    <td style={styles.td}>
                      <select
                        value={exam.status}
                        onChange={e => handleStatusChange(exam.id, e.target.value)}
                        style={{
                          ...styles.statusSelect,
                          backgroundColor: statusColors[exam.status]?.bg || '#EDF2F7',
                          color: statusColors[exam.status]?.color || '#4A5568',
                        }}
                      >
                        {statusOptions.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.countBadge}>{exam.question_count || 0}</span>
                    </td>
                    <td style={styles.td}>{exam.duration_minutes} min</td>
                    <td style={styles.td}>
                      <span style={styles.countBadge}>{exam.submission_count || 0}</span>
                    </td>
                    <td style={styles.td}>
                      {exam.created_at
                        ? new Date(exam.created_at).toLocaleDateString('en-GB')
                        : 'N/A'}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionBtns}>
                        <button style={styles.viewBtn}
                          onClick={() => navigate(`/admin/results?exam=${exam.id}`)}>
                          📊
                        </button>
                        <button style={styles.deleteBtn}
                          onClick={() => handleDelete(exam.id, exam.title)}>
                          🗑️
                        </button>
                      </div>
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
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '26px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  successMsg: { backgroundColor: '#F0FFF4', color: '#276749', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: '600', borderLeft: '4px solid #38A169' },
  errorMsg: { backgroundColor: '#FFF5F5', color: '#C53030', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: '600', borderLeft: '4px solid #E53E3E' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginBottom: '24px' },
  statCard: { backgroundColor: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  statValue: { fontSize: '28px', fontWeight: '800' },
  statLabel: { color: '#666', fontSize: '12px', marginTop: '4px' },
  filtersRow: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  searchInput: { flex: 2, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '14px' },
  select: { flex: 1, minWidth: '140px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '14px', backgroundColor: 'white' },
  bulkBar: { backgroundColor: '#1E3A5F', borderRadius: '10px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  bulkDeleteBtn: { backgroundColor: '#E53E3E', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' },
  clearBtn: { background: 'transparent', color: 'white', border: '1px solid white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  empty: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  tableWrap: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '900px' },
  thead: { backgroundColor: '#1E3A5F' },
  th: { padding: '13px 14px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' },
  tr: { borderBottom: '1px solid #F0F4F8', transition: 'background 0.15s' },
  td: { padding: '12px 14px', fontSize: '13px', color: '#333', verticalAlign: 'middle' },
  examTitle: { fontWeight: '700', color: '#1E3A5F', fontSize: '14px' },
  examMeta: { color: '#888', fontSize: '11px', marginTop: '2px' },
  teacherName: { color: '#555', fontSize: '13px' },
  typeBadge: { backgroundColor: '#EBF8FF', color: '#2B6CB0', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  statusSelect: { border: 'none', padding: '4px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', outline: 'none' },
  countBadge: { backgroundColor: '#EDF2F7', color: '#4A5568', padding: '3px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  actionBtns: { display: 'flex', gap: '6px' },
  viewBtn: { backgroundColor: '#EBF8FF', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  deleteBtn: { backgroundColor: '#FFF5F5', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
};

export default ManageExams;