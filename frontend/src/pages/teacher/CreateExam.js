import React, { useState, useEffect } from 'react';
import { examAPI, questionAPI, classAPI, subjectAPI } from '../../services/api';
import API from '../../services/api';
import { useNavigate } from 'react-router-dom';

function CreateExam() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [examId, setExamId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [examForm, setExamForm] = useState({
    title: '', type: 'objective',
    duration_minutes: 60, pass_mark: 50,
    class_id: '', subject_id: '',
    start_at: '', end_at: ''
  });

  const defaultOptions = [
    { id: 'a', text: '', is_correct: false },
    { id: 'b', text: '', is_correct: false },
    { id: 'c', text: '', is_correct: false },
    { id: 'd', text: '', is_correct: false }
  ];

  const trueFalseOptions = [
    { id: 'true', text: 'True', is_correct: false },
    { id: 'false', text: 'False', is_correct: false }
  ];

  const [questionForm, setQuestionForm] = useState({
    type: 'mcq', body: '', marks: 1, difficulty: 'medium',
    options: defaultOptions, fillAnswer: ''
  });

  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const res = await API.get('/subjects/my-assignments');
      const assignments = res.data.assignments || [];

      // Extract unique classes and subjects from assignments
      const uniqueClasses = [];
      const uniqueSubjects = [];
      const classIds = new Set();
      const subjectIds = new Set();

      assignments.forEach(a => {
        if (!classIds.has(a.class_id)) {
          classIds.add(a.class_id);
          uniqueClasses.push({ id: a.class_id, name: a.class_name });
        }
        if (!subjectIds.has(a.subject_id)) {
          subjectIds.add(a.subject_id);
          uniqueSubjects.push({ id: a.subject_id, name: a.subject_name });
        }
      });

      // If no assignments, fall back to all classes/subjects
      if (assignments.length === 0) {
        const [classRes, subjectRes] = await Promise.all([
          classAPI.getAll(),
          subjectAPI.getAll()
        ]);
        setClasses(classRes.data.classes || []);
        setSubjects(subjectRes.data.subjects || []);
      } else {
        setClasses(uniqueClasses);
        setSubjects(uniqueSubjects);
      }
    } catch (err) {
      // Fallback to all
      classAPI.getAll().then(res => setClasses(res.data.classes)).catch(() => {});
      subjectAPI.getAll().then(res => setSubjects(res.data.subjects)).catch(() => {});
    }
  };

  const handleTypeChange = (type) => {
    setQuestionForm({
      ...questionForm, type,
      options: type === 'true_false' ? trueFalseOptions : defaultOptions,
      fillAnswer: ''
    });
  };

  const handleExamSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        title: examForm.title,
        type: examForm.type,
        duration_minutes: examForm.duration_minutes,
        pass_mark: examForm.pass_mark,
        class_id: examForm.class_id || null,
        subject_id: examForm.subject_id || null,
        start_at: examForm.start_at || null,
        end_at: examForm.end_at || null
      };
      const res = await examAPI.create(payload);
      setExamId(res.data.exam.id);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create exam');
    }
    setLoading(false);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...questionForm.options];
    newOptions[index].text = value;
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const handleCorrectAnswer = (index) => {
    const newOptions = questionForm.options.map((opt, i) => ({
      ...opt, is_correct: i === index
    }));
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const buildQuestionPayload = () => {
    if (questionForm.type === 'fill_blank') {
      return {
        type: 'fill_blank', body: questionForm.body,
        marks: questionForm.marks, difficulty: questionForm.difficulty,
        options: [{ id: 'answer', text: questionForm.fillAnswer, is_correct: true }]
      };
    }
    return {
      type: questionForm.type, body: questionForm.body,
      marks: questionForm.marks, difficulty: questionForm.difficulty,
      options: questionForm.options
    };
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = buildQuestionPayload();
      const qRes = await questionAPI.create(payload);
      await questionAPI.addToExam({ exam_id: examId, question_id: qRes.data.question.id });
      setQuestions([...questions, qRes.data.question]);
      setQuestionForm({
        type: 'mcq', body: '', marks: 1, difficulty: 'medium',
        options: defaultOptions, fillAnswer: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add question');
    }
    setLoading(false);
  };

  const selectedClass = classes.find(c => c.id === examForm.class_id);
  const selectedSubject = subjects.find(s => s.id === examForm.subject_id);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {step === 1 ? '📝 Create New Exam' : `➕ Add Questions (${questions.length} added)`}
          </h1>
          {step === 2 && examForm.title && (
            <p style={styles.examMeta}>
              {examForm.title}
              {selectedClass ? ` · ${selectedClass.name}` : ''}
              {selectedSubject ? ` · ${selectedSubject.name}` : ''}
            </p>
          )}
        </div>
        <div style={styles.steps}>
          <span style={{...styles.step, backgroundColor: '#1E3A5F', color: 'white'}}>
            ① Exam Details
          </span>
          <span style={{
            ...styles.step,
            backgroundColor: step === 2 ? '#1E3A5F' : '#DDD',
            color: step === 2 ? 'white' : '#666'
          }}>
            ② Add Questions
          </span>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* STEP 1 — Exam Details */}
      {step === 1 && (
        <div style={styles.card}>
          <form onSubmit={handleExamSubmit}>

            <div style={styles.field}>
              <label style={styles.label}>Exam Title *</label>
              <input style={styles.input} required
                value={examForm.title}
                onChange={e => setExamForm({...examForm, title: e.target.value})}
                placeholder="e.g. Mathematics Mid-Term Exam"
              />
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Class</label>
                <select style={styles.input}
                  value={examForm.class_id}
                  onChange={e => setExamForm({...examForm, class_id: e.target.value})}
                >
                  <option value="">All Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Subject</label>
                <select style={styles.input}
                  value={examForm.subject_id}
                  onChange={e => setExamForm({...examForm, subject_id: e.target.value})}
                >
                  <option value="">General / No Subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Exam Type *</label>
                <select style={styles.input}
                  value={examForm.type}
                  onChange={e => setExamForm({...examForm, type: e.target.value})}
                >
                  <option value="objective">Objective</option>
                  <option value="theory">Theory</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Duration (minutes) *</label>
                <input style={styles.input} type="number" required min="1"
                  value={examForm.duration_minutes}
                  onChange={e => setExamForm({...examForm, duration_minutes: e.target.value})}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Pass Mark (%) *</label>
                <input style={styles.input} type="number" required min="1" max="100"
                  value={examForm.pass_mark}
                  onChange={e => setExamForm({...examForm, pass_mark: e.target.value})}
                />
              </div>
            </div>

            {/* Scheduling */}
            <div style={styles.scheduleBox}>
              <p style={styles.scheduleTitle}>⏰ Schedule (Optional)</p>
              <p style={styles.scheduleHint}>
                Set start/end times to auto-activate and auto-expire the exam. Leave blank to activate manually.
              </p>
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Start Date & Time</label>
                  <input style={styles.input} type="datetime-local"
                    value={examForm.start_at}
                    onChange={e => setExamForm({...examForm, start_at: e.target.value})}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>End Date & Time</label>
                  <input style={styles.input} type="datetime-local"
                    value={examForm.end_at}
                    onChange={e => setExamForm({...examForm, end_at: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <button type="submit" style={styles.btn} disabled={loading}>
              {loading ? 'Creating...' : 'Create Exam & Add Questions →'}
            </button>
          </form>
        </div>
      )}

      {/* STEP 2 — Add Questions */}
      {step === 2 && (
        <div style={styles.card}>
          <form onSubmit={handleAddQuestion}>
            <div style={styles.field}>
              <label style={styles.label}>Question Type</label>
              <div style={styles.typeRow}>
                {['mcq', 'true_false', 'fill_blank'].map(type => (
                  <button key={type} type="button"
                    onClick={() => handleTypeChange(type)}
                    style={{
                      ...styles.typeBtn,
                      backgroundColor: questionForm.type === type ? '#1E3A5F' : 'white',
                      color: questionForm.type === type ? 'white' : '#333',
                      border: `2px solid ${questionForm.type === type ? '#1E3A5F' : '#DDD'}`
                    }}
                  >
                    {type === 'mcq' ? '🔘 Multiple Choice' :
                     type === 'true_false' ? '✅ True / False' : '✏️ Fill in Blank'}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Question *</label>
              <textarea style={{...styles.input, height: '80px'}} required
                value={questionForm.body}
                onChange={e => setQuestionForm({...questionForm, body: e.target.value})}
                placeholder={questionForm.type === 'fill_blank'
                  ? 'e.g. The capital of Nigeria is ______'
                  : 'Enter your question here'}
              />
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Marks</label>
                <input style={styles.input} type="number" min="1"
                  value={questionForm.marks}
                  onChange={e => setQuestionForm({...questionForm, marks: e.target.value})}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Difficulty</label>
                <select style={styles.input}
                  value={questionForm.difficulty}
                  onChange={e => setQuestionForm({...questionForm, difficulty: e.target.value})}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            {questionForm.type === 'mcq' && (
              <div>
                <label style={styles.label}>Options (click circle to mark correct answer)</label>
                {questionForm.options.map((opt, i) => (
                  <div key={opt.id} style={styles.optionRow}>
                    <button type="button" onClick={() => handleCorrectAnswer(i)}
                      style={{...styles.circle, backgroundColor: opt.is_correct ? '#38A169' : '#DDD'}}>
                      {opt.id.toUpperCase()}
                    </button>
                    <input style={{...styles.input, flex: 1}}
                      placeholder={`Option ${opt.id.toUpperCase()}`}
                      value={opt.text}
                      onChange={e => handleOptionChange(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}

            {questionForm.type === 'true_false' && (
              <div>
                <label style={styles.label}>Select correct answer</label>
                <div style={styles.tfRow}>
                  {questionForm.options.map((opt, i) => (
                    <button key={opt.id} type="button"
                      onClick={() => handleCorrectAnswer(i)}
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

            {questionForm.type === 'fill_blank' && (
              <div style={styles.field}>
                <label style={styles.label}>Correct Answer *</label>
                <input style={styles.input} required
                  value={questionForm.fillAnswer}
                  onChange={e => setQuestionForm({...questionForm, fillAnswer: e.target.value})}
                  placeholder="Type the exact correct answer"
                />
                <p style={styles.hint}>Student answer must match this (not case sensitive)</p>
              </div>
            )}

            <div style={styles.buttonRow}>
              <button type="submit" style={styles.btn} disabled={loading}>
                {loading ? 'Adding...' : '+ Add Question'}
              </button>
              <button type="button"
                style={{...styles.btn, backgroundColor: '#38A169'}}
                onClick={() => navigate('/teacher/dashboard')}
              >
                ✓ Done — Go to Dashboard
              </button>
            </div>
          </form>

          {questions.length > 0 && (
            <div style={styles.questionList}>
              <h3 style={{ color: '#1E3A5F', marginBottom: '12px' }}>
                Questions Added ({questions.length})
              </h3>
              {questions.map((q, i) => (
                <div key={q.id} style={styles.questionItem}>
                  <span style={styles.qNumber}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#333', fontSize: '14px' }}>{q.body}</span>
                    <span style={styles.qType}>{q.type}</span>
                  </div>
                  <span style={{ color: '#38A169', fontSize: '13px', fontWeight: 'bold' }}>
                    ✓ Added
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '800px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  examMeta: { color: '#666', fontSize: '14px' },
  steps: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  step: { padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  error: { backgroundColor: '#FFF5F5', color: '#E53E3E', padding: '10px', borderRadius: '6px', marginBottom: '16px' },
  field: { marginBottom: '16px', flex: 1 },
  row: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  label: { display: 'block', marginBottom: '6px', color: '#333', fontWeight: '600', fontSize: '13px' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DDD', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' },
  hint: { color: '#888', fontSize: '12px', marginTop: '4px' },
  btn: { backgroundColor: '#1E3A5F', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '600' },
  typeRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  typeBtn: { padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  optionRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  circle: { width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', color: 'white', fontWeight: 'bold', flexShrink: 0 },
  tfRow: { display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' },
  tfBtn: { flex: 1, padding: '16px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', minWidth: '120px' },
  buttonRow: { display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' },
  questionList: { marginTop: '24px', borderTop: '1px solid #EEE', paddingTop: '16px' },
  questionItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: '#F7FAFC', borderRadius: '6px', marginBottom: '8px' },
  qNumber: { backgroundColor: '#1E3A5F', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 },
  qType: { backgroundColor: '#EEF2FF', color: '#3730A3', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', marginLeft: '8px' },
  scheduleBox: { backgroundColor: '#F7FAFC', borderRadius: '8px', padding: '16px', marginBottom: '16px', border: '1px solid #E2E8F0' },
  scheduleTitle: { fontWeight: 'bold', color: '#1E3A5F', marginBottom: '4px' },
  scheduleHint: { color: '#888', fontSize: '13px', marginBottom: '12px' }
};

export default CreateExam;
 
