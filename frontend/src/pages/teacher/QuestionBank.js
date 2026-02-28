import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionAPI, examAPI } from '../../services/api';

function QuestionBank() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', difficulty: '', search: '' });
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [adding, setAdding] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const defaultOptions = [
    { id: 'a', text: '', is_correct: false },
    { id: 'b', text: '', is_correct: false },
    { id: 'c', text: '', is_correct: false },
    { id: 'd', text: '', is_correct: false }
  ];

  const [newQuestion, setNewQuestion] = useState({
    type: 'mcq', body: '', marks: 1,
    difficulty: 'medium', options: defaultOptions, fillAnswer: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [filters]);

  const loadData = async () => {
    try {
      const [qRes, eRes] = await Promise.all([
        questionAPI.getAll(),
        examAPI.getAll()
      ]);
      setQuestions(qRes.data.questions);
      setExams(eRes.data.exams.filter(e => e.status === 'draft'));
    } catch (err) {
      console.error('Failed to load data');
    }
    setLoading(false);
  };

  const loadQuestions = async () => {
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.search) params.search = filters.search;
      const res = await questionAPI.getAll(params);
      setQuestions(res.data.questions);
    } catch (err) {
      console.error('Failed to load questions');
    }
  };

  const toggleSelect = (id) => {
    setSelectedQuestions(prev =>
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    );
  };

  const handleAddToExam = async () => {
    if (!selectedExam) return alert('Please select an exam first');
    if (selectedQuestions.length === 0) return alert('Please select at least one question');
    setAdding(true);
    setError('');
    setSuccess('');
    let successCount = 0;
    for (const question_id of selectedQuestions) {
      try {
        await questionAPI.addToExam({ exam_id: selectedExam, question_id });
        successCount++;
      } catch (err) {
        // Question might already be in exam
      }
    }
    setSuccess(`${successCount} question(s) added to exam successfully!`);
    setSelectedQuestions([]);
    setAdding(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await questionAPI.create && await fetch(
        `http://localhost:5000/api/questions/${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      loadQuestions();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let options = newQuestion.options;
      if (newQuestion.type === 'fill_blank') {
        options = [{ id: 'answer', text: newQuestion.fillAnswer, is_correct: true }];
      }
      await questionAPI.create({
        type: newQuestion.type,
        body: newQuestion.body,
        marks: newQuestion.marks,
        difficulty: newQuestion.difficulty,
        options
      });
      setSuccess('Question created successfully!');
      setShowCreate(false);
      setNewQuestion({
        type: 'mcq', body: '', marks: 1,
        difficulty: 'medium', options: defaultOptions, fillAnswer: ''
      });
      loadQuestions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create question');
    }
  };

  const typeLabel = { mcq: '🔘 MCQ', true_false: '✅ T/F', fill_blank: '✏️ Fill' };
  const diffColor = { easy: '#38A169', medium: '#D69E2E', hard: '#E53E3E' };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Question Bank 📚</h1>
          <p style={styles.subtitle}>{questions.length} questions available</p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.createBtn} onClick={() => setShowCreate(!showCreate)}>
            + New Question
          </button>
          <button style={styles.backBtn} onClick={() => navigate('/teacher/dashboard')}>
            ← Dashboard
          </button>
          <button style={styles.uploadBtn} onClick={() => navigate('/teacher/bulk-upload')}>
            📤 Bulk Upload
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.successMsg}>{success}</div>}

      {/* Create Question Form */}
      {showCreate && (
        <div style={styles.createBox}>
          <h3 style={styles.createTitle}>Create New Question</h3>
          <form onSubmit={handleCreateQuestion}>
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Type</label>
                <select
                  style={styles.input}
                  value={newQuestion.type}
                  onChange={e => setNewQuestion({
                    ...newQuestion, type: e.target.value,
                    options: e.target.value === 'true_false'
                      ? [{id:'true',text:'True',is_correct:false},{id:'false',text:'False',is_correct:false}]
                      : defaultOptions
                  })}
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="fill_blank">Fill in the Blank</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Marks</label>
                <input
                  style={styles.input} type="number" min="1"
                  value={newQuestion.marks}
                  onChange={e => setNewQuestion({...newQuestion, marks: e.target.value})}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Difficulty</label>
                <select
                  style={styles.input}
                  value={newQuestion.difficulty}
                  onChange={e => setNewQuestion({...newQuestion, difficulty: e.target.value})}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Question</label>
              <textarea
                style={{...styles.input, height: '70px'}} required
                value={newQuestion.body}
                onChange={e => setNewQuestion({...newQuestion, body: e.target.value})}
                placeholder="Enter your question"
              />
            </div>

            {newQuestion.type === 'mcq' && (
              <div>
                <label style={styles.label}>Options (click letter to mark correct)</label>
                {newQuestion.options.map((opt, i) => (
                  <div key={opt.id} style={styles.optRow}>
                    <button type="button"
                      onClick={() => setNewQuestion({
                        ...newQuestion,
                        options: newQuestion.options.map((o, j) => ({...o, is_correct: j === i}))
                      })}
                      style={{...styles.circle, backgroundColor: opt.is_correct ? '#38A169' : '#DDD'}}
                    >
                      {opt.id.toUpperCase()}
                    </button>
                    <input
                      style={{...styles.input, flex: 1}}
                      placeholder={`Option ${opt.id.toUpperCase()}`}
                      value={opt.text}
                      onChange={e => setNewQuestion({
                        ...newQuestion,
                        options: newQuestion.options.map((o, j) =>
                          j === i ? {...o, text: e.target.value} : o
                        )
                      })}
                    />
                  </div>
                ))}
              </div>
            )}

            {newQuestion.type === 'true_false' && (
              <div>
                <label style={styles.label}>Correct Answer</label>
                <div style={styles.tfRow}>
                  {newQuestion.options.map((opt, i) => (
                    <button key={opt.id} type="button"
                      onClick={() => setNewQuestion({
                        ...newQuestion,
                        options: newQuestion.options.map((o, j) => ({...o, is_correct: j === i}))
                      })}
                      style={{
                        ...styles.tfBtn,
                        backgroundColor: opt.is_correct
                          ? (opt.id === 'true' ? '#38A169' : '#E53E3E') : '#F7FAFC',
                        color: opt.is_correct ? 'white' : '#333',
                        border: `2px solid ${opt.is_correct
                          ? (opt.id === 'true' ? '#38A169' : '#E53E3E') : '#DDD'}`
                      }}
                    >
                      {opt.id === 'true' ? '✅ True' : '❌ False'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {newQuestion.type === 'fill_blank' && (
              <div style={styles.field}>
                <label style={styles.label}>Correct Answer</label>
                <input
                  style={styles.input} required
                  value={newQuestion.fillAnswer}
                  onChange={e => setNewQuestion({...newQuestion, fillAnswer: e.target.value})}
                  placeholder="Exact correct answer"
                />
              </div>
            )}

            <div style={styles.row}>
              <button type="submit" style={styles.createBtn}>Save Question</button>
              <button type="button" style={styles.backBtn}
                onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={styles.filtersRow}>
        <input
          style={{...styles.input, flex: 2}}
          placeholder="🔍 Search questions..."
          value={filters.search}
          onChange={e => setFilters({...filters, search: e.target.value})}
        />
        <select style={{...styles.input, flex: 1}}
          value={filters.type}
          onChange={e => setFilters({...filters, type: e.target.value})}
        >
          <option value="">All Types</option>
          <option value="mcq">MCQ</option>
          <option value="true_false">True/False</option>
          <option value="fill_blank">Fill in Blank</option>
        </select>
        <select style={{...styles.input, flex: 1}}
          value={filters.difficulty}
          onChange={e => setFilters({...filters, difficulty: e.target.value})}
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Add to Exam Bar */}
      {selectedQuestions.length > 0 && (
        <div style={styles.addBar}>
          <span style={styles.addBarText}>
            {selectedQuestions.length} question(s) selected
          </span>
          <select
            style={{...styles.input, width: '250px'}}
            value={selectedExam}
            onChange={e => setSelectedExam(e.target.value)}
          >
            <option value="">Select exam to add to...</option>
            {exams.map(e => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
          <button
            style={styles.addBtn}
            onClick={handleAddToExam}
            disabled={adding}
          >
            {adding ? 'Adding...' : 'Add to Exam →'}
          </button>
          <button
            style={styles.clearBtn}
            onClick={() => setSelectedQuestions([])}
          >
            Clear
          </button>
        </div>
      )}

      {/* Questions List */}
      {loading ? (
        <p>Loading questions...</p>
      ) : questions.length === 0 ? (
        <div style={styles.empty}>
          <p>No questions found. Create your first question!</p>
        </div>
      ) : (
        <div style={styles.questionList}>
          {questions.map(q => (
            <div
              key={q.id}
              style={{
                ...styles.questionCard,
                borderLeft: selectedQuestions.includes(q.id)
                  ? '4px solid #1E3A5F' : '4px solid #EEE'
              }}
            >
              <div style={styles.questionTop}>
                <input
                  type="checkbox"
                  checked={selectedQuestions.includes(q.id)}
                  onChange={() => toggleSelect(q.id)}
                  style={styles.checkbox}
                />
                <div style={styles.questionBody}>
                  <p style={styles.questionText}>{q.body}</p>
                  <div style={styles.questionMeta}>
                    <span style={styles.typeBadge}>{typeLabel[q.type]}</span>
                    <span style={{
                      ...styles.diffBadge,
                      backgroundColor: diffColor[q.difficulty] + '22',
                      color: diffColor[q.difficulty]
                    }}>
                      {q.difficulty}
                    </span>
                    <span style={styles.metaItem}>⭐ {q.marks} mark(s)</span>
                    <span style={styles.metaItem}>
                      📋 Used in {q.used_in_exams} exam(s)
                    </span>
                    <span style={styles.metaItem}>
                      👤 {q.created_by_name}
                    </span>
                  </div>
                </div>
                <button
                  style={styles.deleteBtn}
                  onClick={() => handleDelete(q.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '24px', maxWidth: '1100px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { color: '#1E3A5F', fontSize: '28px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  headerBtns: { display: 'flex', gap: '10px' },
  createBtn: { backgroundColor: '#1E3A5F', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  error: { backgroundColor: '#FFF5F5', color: '#E53E3E', padding: '10px', borderRadius: '6px', marginBottom: '16px' },
  successMsg: { backgroundColor: '#F0FFF4', color: '#276749', padding: '10px', borderRadius: '6px', marginBottom: '16px' },
  createBox: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  createTitle: { color: '#1E3A5F', marginBottom: '16px' },
  row: { display: 'flex', gap: '16px', marginBottom: '16px' },
  field: { flex: 1, marginBottom: '12px' },
  label: { display: 'block', marginBottom: '6px', color: '#333', fontWeight: '500', fontSize: '14px' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DDD', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' },
  optRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  circle: { width: '34px', height: '34px', borderRadius: '50%', border: 'none', cursor: 'pointer', color: 'white', fontWeight: 'bold', flexShrink: 0 },
  tfRow: { display: 'flex', gap: '16px', marginTop: '8px' },
  tfBtn: { flex: 1, padding: '14px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
  filtersRow: { display: 'flex', gap: '12px', marginBottom: '16px' },
  addBar: { backgroundColor: '#1E3A5F', borderRadius: '10px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  addBarText: { color: 'white', fontWeight: 'bold', flex: 1 },
  addBtn: { backgroundColor: '#38A169', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  clearBtn: { backgroundColor: 'transparent', color: 'white', border: '1px solid white', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' },
  empty: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  questionList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  questionCard: { backgroundColor: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' },
  questionTop: { display: 'flex', alignItems: 'flex-start', gap: '12px' },
  checkbox: { width: '18px', height: '18px', marginTop: '3px', cursor: 'pointer', flexShrink: 0 },
  questionBody: { flex: 1 },
  questionText: { color: '#333', fontSize: '15px', marginBottom: '8px', fontWeight: '500' },
  questionMeta: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  typeBadge: { backgroundColor: '#EEF2FF', color: '#3730A3', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' },
  diffBadge: { padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' },
  metaItem: { color: '#888', fontSize: '12px' },
  uploadBtn: { backgroundColor: '#38A169', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px' }
};

export default QuestionBank;