import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionAPI } from '../../services/api';
import API from '../../services/api';

function ManageQuestions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [examRes, bankRes] = await Promise.all([
        API.get(`/exams/${id}`),
        questionAPI.getAll()
      ]);
      setExam(examRes.data.exam);
      setExamQuestions(examRes.data.questions || []);
      setBankQuestions(bankRes.data.questions || []);
    } catch (err) {
      console.error('Failed to load data');
    }
    setLoading(false);
  };

  const handleRemove = async (question_id) => {
    if (!window.confirm('Remove this question from the exam?')) return;
    try {
      await questionAPI.removeFromExam({ exam_id: id, question_id });
      loadData();
    } catch (err) {
      alert('Failed to remove question');
    }
  };

  const handleAddFromBank = async (question_id) => {
    try {
      await questionAPI.addToExam({ exam_id: id, question_id });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add question');
    }
  };

  const examQuestionIds = new Set(examQuestions.map(q => q.id));

  const filteredBank = bankQuestions.filter(q => {
    const notInExam = !examQuestionIds.has(q.id);
    const matchSearch = q.body.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || q.type === filterType;
    return notInExam && matchSearch && matchType;
  });

  const typeColors = { mcq: '#3182CE', true_false: '#38A169', fill_blank: '#D69E2E' };
  const diffColors = { easy: '#38A169', medium: '#D69E2E', hard: '#E53E3E' };

  if (loading) return <div style={styles.center}><p>Loading...</p></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📝 Manage Questions</h1>
          <p style={styles.subtitle}>{exam?.title}</p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.backBtn} onClick={() => navigate('/teacher/dashboard')}>
            ← Dashboard
          </button>
          <button style={styles.createBtn}
            onClick={() => navigate(`/teacher/create-exam?examId=${id}`)}>
            + Add New Question
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statBox}>
          <span style={styles.statVal}>{examQuestions.length}</span>
          <span style={styles.statLbl}>Questions in Exam</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statVal}>
            {examQuestions.reduce((sum, q) => sum + (q.marks || 1), 0)}
          </span>
          <span style={styles.statLbl}>Total Marks</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statVal}>{bankQuestions.length}</span>
          <span style={styles.statLbl}>In Question Bank</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={{
          ...styles.tab,
          backgroundColor: activeTab === 'current' ? '#1E3A5F' : 'white',
          color: activeTab === 'current' ? 'white' : '#333'
        }} onClick={() => setActiveTab('current')}>
          📋 Current Questions ({examQuestions.length})
        </button>
        <button style={{
          ...styles.tab,
          backgroundColor: activeTab === 'bank' ? '#1E3A5F' : 'white',
          color: activeTab === 'bank' ? 'white' : '#333'
        }} onClick={() => setActiveTab('bank')}>
          📚 Add from Bank ({filteredBank.length})
        </button>
      </div>

      {/* Current Questions */}
      {activeTab === 'current' && (
        <div>
          {examQuestions.length === 0 ? (
            <div style={styles.empty}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              <p>No questions in this exam yet.</p>
              <button style={styles.createBtn} onClick={() => setActiveTab('bank')}>
                Add from Question Bank
              </button>
            </div>
          ) : (
            examQuestions.map((q, i) => (
              <div key={q.id} style={styles.questionCard}>
                <div style={styles.questionTop}>
                  <span style={styles.qNum}>{i + 1}</span>
                  <div style={styles.questionMeta}>
                    <span style={{
                      ...styles.typeBadge,
                      backgroundColor: typeColors[q.type] || '#718096'
                    }}>
                      {q.type}
                    </span>
                    <span style={{
                      ...styles.diffBadge,
                      backgroundColor: diffColors[q.difficulty] || '#718096'
                    }}>
                      {q.difficulty}
                    </span>
                    <span style={styles.marksBadge}>{q.marks} mark(s)</span>
                  </div>
                  <button style={styles.removeBtn} onClick={() => handleRemove(q.id)}>
                    🗑️ Remove
                  </button>
                </div>
                <p style={styles.questionBody}>{q.body}</p>
                {q.type === 'mcq' && q.options && (
                  <div style={styles.optionsPreview}>
                    {q.options.map(opt => (
                      <span key={opt.id} style={{
                        ...styles.optionChip,
                        backgroundColor: opt.is_correct ? '#C6F6D5' : '#F7FAFC',
                        border: `1px solid ${opt.is_correct ? '#38A169' : '#DDD'}`,
                        color: opt.is_correct ? '#276749' : '#333'
                      }}>
                        {opt.id.toUpperCase()}. {opt.text}
                        {opt.is_correct && ' ✅'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Question Bank */}
      {activeTab === 'bank' && (
        <div>
          <div style={styles.filterRow}>
            <input style={styles.searchInput}
              placeholder="🔍 Search questions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select style={styles.filterSelect}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="mcq">MCQ</option>
              <option value="true_false">True/False</option>
              <option value="fill_blank">Fill in Blank</option>
            </select>
          </div>

          {filteredBank.length === 0 ? (
            <div style={styles.empty}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              <p>No questions available to add.</p>
            </div>
          ) : (
            filteredBank.map((q, i) => (
              <div key={q.id} style={styles.questionCard}>
                <div style={styles.questionTop}>
                  <span style={styles.qNum}>{i + 1}</span>
                  <div style={styles.questionMeta}>
                    <span style={{
                      ...styles.typeBadge,
                      backgroundColor: typeColors[q.type] || '#718096'
                    }}>
                      {q.type}
                    </span>
                    <span style={{
                      ...styles.diffBadge,
                      backgroundColor: diffColors[q.difficulty] || '#718096'
                    }}>
                      {q.difficulty || 'medium'}
                    </span>
                    <span style={styles.marksBadge}>{q.marks} mark(s)</span>
                  </div>
                  <button style={styles.addBtn} onClick={() => handleAddFromBank(q.id)}>
                    + Add to Exam
                  </button>
                </div>
                <p style={styles.questionBody}>{q.body}</p>
              </div>
            ))
          )}
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
  createBtn: { backgroundColor: '#1E3A5F', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  statsRow: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  statBox: { backgroundColor: 'white', borderRadius: '10px', padding: '16px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '120px' },
  statVal: { fontSize: '28px', fontWeight: '700', color: '#1E3A5F' },
  statLbl: { color: '#666', fontSize: '13px', marginTop: '4px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  tab: { padding: '10px 20px', border: '1px solid #DDD', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  empty: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  questionCard: { backgroundColor: 'white', borderRadius: '10px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' },
  questionTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' },
  qNum: { backgroundColor: '#1E3A5F', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 },
  questionMeta: { display: 'flex', gap: '6px', flex: 1, flexWrap: 'wrap' },
  typeBadge: { color: 'white', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' },
  diffBadge: { color: 'white', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' },
  marksBadge: { backgroundColor: '#EDF2F7', color: '#4A5568', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' },
  removeBtn: { backgroundColor: '#FED7D7', color: '#9B2C2C', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginLeft: 'auto' },
  addBtn: { backgroundColor: '#C6F6D5', color: '#276749', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginLeft: 'auto' },
  questionBody: { color: '#333', fontSize: '14px', lineHeight: '1.5', marginBottom: '10px' },
  optionsPreview: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  optionChip: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px' },
  filterRow: { display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' },
  searchInput: { flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '14px' },
  filterSelect: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '14px', backgroundColor: 'white' }
};

export default ManageQuestions;