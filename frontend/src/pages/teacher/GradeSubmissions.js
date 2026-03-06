import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../services/api';

function GradeSubmissions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [grades, setGrades] = useState({});
  const [feedback, setFeedback] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    try {
      const res = await API.get(`/exams/${id}/grading`);
      setExam(res.data.exam);
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error('Failed to load grading data');
    }
    setLoading(false);
  };

  const loadStudentAnswers = async (session) => {
    setSelected(session);
    setSaved({});
    try {
      const res = await API.get(`/exams/${id}/grading/${session.session_id}`);
      const gradeable = res.data.answers.filter(a =>
        a.type === 'essay' || a.type === 'short_answer'
      );
      setAnswers(gradeable);
      const initialGrades = {};
      const initialFeedback = {};
      gradeable.forEach(a => {
        initialGrades[a.question_id] = a.marks_awarded ?? '';
        initialFeedback[a.question_id] = a.feedback || '';
      });
      setGrades(initialGrades);
      setFeedback(initialFeedback);
    } catch (err) {
      console.error('Failed to load answers');
    }
  };

  const handleSaveGrade = async (questionId, maxMarks) => {
    const marks = parseFloat(grades[questionId]);
    if (isNaN(marks) || marks < 0 || marks > maxMarks) {
      alert(`Marks must be between 0 and ${maxMarks}`);
      return;
    }
    setSaving(true);
    try {
      await API.post(`/exams/${id}/grading/${selected.session_id}/grade`, {
        question_id: questionId,
        marks_awarded: marks,
        feedback: feedback[questionId] || ''
      });
      setSaved(prev => ({ ...prev, [questionId]: true }));
      loadSessions();
    } catch (err) {
      alert('Failed to save grade');
    }
    setSaving(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    for (const a of answers) {
      const marks = parseFloat(grades[a.question_id]);
      if (!isNaN(marks) && marks >= 0 && marks <= a.marks) {
        try {
          await API.post(`/exams/${id}/grading/${selected.session_id}/grade`, {
            question_id: a.question_id,
            marks_awarded: marks,
            feedback: feedback[a.question_id] || ''
          });
          setSaved(prev => ({ ...prev, [a.question_id]: true }));
        } catch (err) { console.error('Failed to save', a.question_id); }
      }
    }
    loadSessions();
    setSaving(false);
  };

  const filtered = sessions.filter(s => {
    if (filter === 'graded') return s.fully_graded;
    if (filter === 'pending') return !s.fully_graded;
    return true;
  });

  const pendingCount = sessions.filter(s => !s.fully_graded).length;

  if (loading) return <div style={styles.center}><p>Loading...</p></div>;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>✍️ Manual Grading</h1>
          <p style={styles.subtitle}>{exam?.title}</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/teacher/dashboard')}>
          ← Dashboard
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total Submissions', value: sessions.length, color: '#1E3A5F' },
          { label: 'Pending Grading', value: pendingCount, color: '#E07B20' },
          { label: 'Fully Graded', value: sessions.length - pendingCount, color: '#38A169' },
        ].map((s, i) => (
          <div key={i} style={{ ...styles.statCard, borderTop: `4px solid ${s.color}` }}>
            <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.layout}>
        {/* Left — Student List */}
        <div style={styles.leftPanel}>
          <div style={styles.panelCard}>
            <h3 style={styles.panelTitle}>📋 Submissions</h3>
            <div style={styles.filterBtns}>
              {['all', 'pending', 'graded'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  ...styles.filterBtn,
                  backgroundColor: filter === f ? '#1E3A5F' : '#F7FAFC',
                  color: filter === f ? 'white' : '#555'
                }}>
                  {f === 'all' ? `All (${sessions.length})` :
                   f === 'pending' ? `⏳ Pending (${pendingCount})` :
                   `✅ Graded (${sessions.length - pendingCount})`}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p style={styles.emptyText}>No submissions found.</p>
            ) : (
              filtered.map(s => (
                <div key={s.session_id}
                  onClick={() => loadStudentAnswers(s)}
                  style={{
                    ...styles.studentItem,
                    backgroundColor: selected?.session_id === s.session_id ? '#EBF8FF' : '#F7FAFC',
                    border: `2px solid ${selected?.session_id === s.session_id ? '#3182CE' : 'transparent'}`
                  }}>
                  <div style={styles.studentAvatar}>
                    {s.student_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div style={styles.studentInfo}>
                    <div style={styles.studentName}>{s.student_name}</div>
                    <div style={styles.studentMeta}>
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-GB') : 'N/A'}
                    </div>
                  </div>
                  <div style={styles.studentStatus}>
                    {s.fully_graded ? (
                      <span style={styles.gradedBadge}>✅ Done</span>
                    ) : (
                      <span style={styles.pendingBadge}>⏳ Pending</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right — Grading Panel */}
        <div style={styles.rightPanel}>
          {!selected ? (
            <div style={styles.noSelection}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>✍️</div>
              <h3 style={{ color: '#1E3A5F', marginBottom: '8px' }}>Select a Student</h3>
              <p style={{ color: '#666' }}>Click a student on the left to start grading their essay and short answer questions.</p>
            </div>
          ) : (
            <div>
              {/* Student Header */}
              <div style={styles.studentHeader}>
                <div style={styles.studentAvatarLg}>
                  {selected.student_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={styles.studentFullName}>{selected.student_name}</h2>
                  <p style={{ color: '#666', fontSize: '13px' }}>
                    Submitted: {selected.submitted_at ? new Date(selected.submitted_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <button style={styles.saveAllBtn} onClick={handleSaveAll} disabled={saving}>
                  {saving ? '⏳ Saving...' : '💾 Save All Grades'}
                </button>
              </div>

              {answers.length === 0 ? (
                <div style={styles.noAnswers}>
                  <p>No essay or short answer questions to grade.</p>
                </div>
              ) : (
                answers.map((a, i) => (
                  <div key={a.question_id} style={{
                    ...styles.questionCard,
                    borderLeft: `5px solid ${saved[a.question_id] ? '#38A169' : '#E07B20'}`
                  }}>
                    {/* Question */}
                    <div style={styles.questionHeader}>
                      <span style={styles.qNum}>Q{i + 1}</span>
                      <span style={styles.qType}>{a.type === 'essay' ? '📄 Essay' : '📝 Short Answer'}</span>
                      <span style={styles.qMaxMarks}>Max: {a.marks} marks</span>
                      {saved[a.question_id] && (
                        <span style={styles.savedBadge}>✅ Saved</span>
                      )}
                    </div>
                    <p style={styles.questionText}>{a.body}</p>

                    {/* Student Answer */}
                    <div style={styles.answerSection}>
                      <div style={styles.answerLabel}>📝 Student's Answer:</div>
                      <div style={styles.answerBox}>
                        {a.student_answer || <span style={{ color: '#999', fontStyle: 'italic' }}>No answer provided</span>}
                      </div>
                    </div>

                    {/* Model Answer */}
                    {a.model_answer && (
                      <div style={styles.modelSection}>
                        <div style={styles.modelLabel}>💡 Model Answer:</div>
                        <div style={styles.modelBox}>{a.model_answer}</div>
                      </div>
                    )}

                    {/* Grading Controls */}
                    <div style={styles.gradingRow}>
                      <div style={styles.marksInput}>
                        <label style={styles.gradeLabel}>Marks Awarded (0 – {a.marks}):</label>
                        <input
                          type="number" min="0" max={a.marks} step="0.5"
                          value={grades[a.question_id] ?? ''}
                          onChange={e => setGrades(prev => ({ ...prev, [a.question_id]: e.target.value }))}
                          style={styles.marksField}
                          placeholder={`0 - ${a.marks}`}
                        />
                      </div>
                      <div style={styles.feedbackInput}>
                        <label style={styles.gradeLabel}>Feedback (optional):</label>
                        <input
                          type="text"
                          value={feedback[a.question_id] || ''}
                          onChange={e => setFeedback(prev => ({ ...prev, [a.question_id]: e.target.value }))}
                          style={styles.feedbackField}
                          placeholder="e.g. Good explanation but missing key points"
                        />
                      </div>
                      <button
                        style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
                        onClick={() => handleSaveGrade(a.question_id, a.marks)}
                        disabled={saving}
                      >
                        💾 Save
                      </button>
                    </div>

                    {/* Quick Mark Buttons */}
                    <div style={styles.quickMarks}>
                      <span style={styles.quickLabel}>Quick:</span>
                      {[0, Math.floor(a.marks * 0.25), Math.floor(a.marks * 0.5), Math.floor(a.marks * 0.75), a.marks].map(v => (
                        <button key={v} style={styles.quickBtn}
                          onClick={() => setGrades(prev => ({ ...prev, [a.question_id]: v }))}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '1300px', margin: '0 auto' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '26px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  statsRow: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  statCard: { backgroundColor: 'white', borderRadius: '12px', padding: '16px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center', flex: 1, minWidth: '120px' },
  statValue: { fontSize: '28px', fontWeight: '800' },
  statLabel: { color: '#666', fontSize: '12px', marginTop: '4px' },
  layout: { display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' },
  leftPanel: { width: '300px', flexShrink: 0, flex: '1 1 280px', minWidth: '260px' },
  rightPanel: { flex: '2 1 400px', minWidth: '300px' },
  panelCard: { backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  panelTitle: { color: '#1E3A5F', fontSize: '15px', fontWeight: '700', marginBottom: '12px' },
  filterBtns: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' },
  filterBtn: { padding: '8px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', textAlign: 'left' },
  emptyText: { color: '#888', fontSize: '14px', textAlign: 'center', padding: '20px 0' },
  studentItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', cursor: 'pointer', marginBottom: '8px' },
  studentAvatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1E3A5F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', flexShrink: 0 },
  studentInfo: { flex: 1 },
  studentName: { fontWeight: '700', color: '#1E3A5F', fontSize: '14px' },
  studentMeta: { color: '#888', fontSize: '11px', marginTop: '2px' },
  studentStatus: { flexShrink: 0 },
  gradedBadge: { backgroundColor: '#C6F6D5', color: '#276749', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' },
  pendingBadge: { backgroundColor: '#FEFCBF', color: '#744210', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' },
  noSelection: { backgroundColor: 'white', borderRadius: '14px', padding: '60px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  studentHeader: { display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flexWrap: 'wrap' },
  studentAvatarLg: { width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#1E3A5F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '18px', flexShrink: 0 },
  studentFullName: { color: '#1E3A5F', fontSize: '18px', marginBottom: '4px' },
  saveAllBtn: { backgroundColor: '#38A169', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  noAnswers: { backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#666' },
  questionCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  questionHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' },
  qNum: { backgroundColor: '#1E3A5F', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' },
  qType: { backgroundColor: '#FFF3E0', color: '#E07B20', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' },
  qMaxMarks: { backgroundColor: '#EDF2F7', color: '#4A5568', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' },
  savedBadge: { backgroundColor: '#C6F6D5', color: '#276749', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', marginLeft: 'auto' },
  questionText: { color: '#333', fontSize: '15px', fontWeight: '600', marginBottom: '16px', lineHeight: '1.6' },
  answerSection: { marginBottom: '14px' },
  answerLabel: { color: '#555', fontSize: '13px', fontWeight: '700', marginBottom: '8px' },
  answerBox: { backgroundColor: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', fontSize: '14px', color: '#333', lineHeight: '1.7', minHeight: '60px' },
  modelSection: { marginBottom: '14px' },
  modelLabel: { color: '#276749', fontSize: '13px', fontWeight: '700', marginBottom: '8px' },
  modelBox: { backgroundColor: '#F0FFF4', border: '1px solid #68D391', borderRadius: '10px', padding: '12px', fontSize: '13px', color: '#276749', lineHeight: '1.6' },
  gradingRow: { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '12px' },
  marksInput: { minWidth: '160px' },
  feedbackInput: { flex: 1, minWidth: '200px' },
  gradeLabel: { display: 'block', fontSize: '12px', fontWeight: '700', color: '#555', marginBottom: '6px' },
  marksField: { width: '100%', padding: '10px', border: '2px solid #E07B20', borderRadius: '8px', fontSize: '16px', fontWeight: '700', textAlign: 'center', color: '#1E3A5F' },
  feedbackField: { width: '100%', padding: '10px', border: '1.5px solid #DDD', borderRadius: '8px', fontSize: '14px', color: '#333' },
  saveBtn: { backgroundColor: '#38A169', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap' },
  quickMarks: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  quickLabel: { color: '#888', fontSize: '12px', fontWeight: '600' },
  quickBtn: { backgroundColor: '#EBF8FF', color: '#2B6CB0', border: '1px solid #BEE3F8', padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }
};

export default GradeSubmissions;