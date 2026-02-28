import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../services/api';

function ExamReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReview(); }, []);

  const loadReview = async () => {
    try {
      const res = await API.get(`/sessions/${id}/review`);
      setReview(res.data);
    } catch (err) {
      console.error('Failed to load review');
    }
    setLoading(false);
  };

  if (loading) return <div style={styles.center}><p>Loading review...</p></div>;
  if (!review) return <div style={styles.center}><p>Review not available.</p></div>;

  const { session, exam, questions } = review;
  const percentage = exam.total_marks > 0
    ? ((session.score / exam.total_marks) * 100).toFixed(1) : 0;
  const passed = session.score >= exam.pass_mark;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📋 Exam Review</h1>
          <p style={styles.subtitle}>{exam.title}</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/student/results')}>
          ← My Results
        </button>
      </div>

      {/* Score Summary */}
      <div style={{
        ...styles.scoreBanner,
        borderTop: `6px solid ${passed ? '#38A169' : '#E53E3E'}`
      }}>
        <div style={styles.scoreMain}>
          <div style={styles.scoreValue}>{session.score}/{exam.total_marks}</div>
          <div style={styles.scorePercent}>{percentage}%</div>
          <span style={{
            ...styles.scoreBadge,
            backgroundColor: passed ? '#C6F6D5' : '#FED7D7',
            color: passed ? '#276749' : '#9B2C2C'
          }}>
            {passed ? '🎉 PASSED' : '❌ FAILED'}
          </span>
        </div>
        <div style={styles.scoreStats}>
          <div style={styles.scoreStat}>
            <div style={styles.scoreStatVal}>{questions.filter(q => q.is_correct).length}</div>
            <div style={styles.scoreStatLabel}>Correct</div>
          </div>
          <div style={styles.scoreStat}>
            <div style={styles.scoreStatVal}>{questions.filter(q => !q.is_correct).length}</div>
            <div style={styles.scoreStatLabel}>Wrong</div>
          </div>
          <div style={styles.scoreStat}>
            <div style={styles.scoreStatVal}>{questions.length}</div>
            <div style={styles.scoreStatLabel}>Total</div>
          </div>
          <div style={styles.scoreStat}>
            <div style={styles.scoreStatVal}>{exam.pass_mark}%</div>
            <div style={styles.scoreStatLabel}>Pass Mark</div>
          </div>
        </div>
      </div>

      {/* Questions Review */}
      <h2 style={styles.sectionTitle}>Question by Question Review</h2>
      {questions.map((q, i) => (
        <div key={q.id} style={{
          ...styles.questionCard,
          borderLeft: `4px solid ${q.is_correct ? '#38A169' : q.student_answer ? '#E53E3E' : '#D69E2E'}`
        }}>
          <div style={styles.questionHeader}>
            <span style={styles.qNum}>Q{i + 1}</span>
            <span style={{
              ...styles.qStatus,
              backgroundColor: q.is_correct ? '#C6F6D5' : q.student_answer ? '#FED7D7' : '#FEFCBF',
              color: q.is_correct ? '#276749' : q.student_answer ? '#9B2C2C' : '#744210'
            }}>
              {q.is_correct ? '✅ Correct' : q.student_answer ? '❌ Wrong' : '⚠️ Not Answered'}
            </span>
            <span style={styles.qMarks}>{q.marks_awarded || 0}/{q.marks} marks</span>
          </div>

          <p style={styles.questionText}>{q.body}</p>

          {/* MCQ */}
          {q.type === 'mcq' && (
            <div style={styles.optionsList}>
              {q.options.map(opt => {
                const isCorrect = opt.is_correct;
                const isStudentAnswer = q.student_answer === opt.id;
                let bg = '#F7FAFC';
                let border = '#DDD';
                if (isCorrect) { bg = '#F0FFF4'; border = '#38A169'; }
                if (isStudentAnswer && !isCorrect) { bg = '#FFF5F5'; border = '#E53E3E'; }
                return (
                  <div key={opt.id} style={{
                    ...styles.option,
                    backgroundColor: bg,
                    border: `1.5px solid ${border}`
                  }}>
                    <span style={styles.optId}>{opt.id.toUpperCase()}</span>
                    <span style={styles.optText}>{opt.text}</span>
                    {isCorrect && <span style={styles.correctTag}>✅ Correct</span>}
                    {isStudentAnswer && !isCorrect && <span style={styles.wrongTag}>Your answer</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* True/False */}
          {q.type === 'true_false' && (
            <div style={styles.tfReview}>
              <div style={styles.tfItem}>
                <strong>Your answer:</strong>{' '}
                <span style={{ color: q.is_correct ? '#38A169' : '#E53E3E', fontWeight: 'bold' }}>
                  {q.student_answer ? q.student_answer.toUpperCase() : 'Not answered'}
                </span>
              </div>
              <div style={styles.tfItem}>
                <strong>Correct answer:</strong>{' '}
                <span style={{ color: '#38A169', fontWeight: 'bold' }}>
                  {q.options.find(o => o.is_correct)?.id?.toUpperCase()}
                </span>
              </div>
            </div>
          )}

          {/* Fill in Blank */}
          {q.type === 'fill_blank' && (
            <div style={styles.tfReview}>
              <div style={styles.tfItem}>
                <strong>Your answer:</strong>{' '}
                <span style={{ color: q.is_correct ? '#38A169' : '#E53E3E', fontWeight: 'bold' }}>
                  {q.student_answer || 'Not answered'}
                </span>
              </div>
              <div style={styles.tfItem}>
                <strong>Correct answer:</strong>{' '}
                <span style={{ color: '#38A169', fontWeight: 'bold' }}>
                  {q.options[0]?.text}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}

      <button style={styles.doneBtn} onClick={() => navigate('/student/results')}>
        ← Back to My Results
      </button>
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '900px', margin: '0 auto' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  scoreBanner: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' },
  scoreMain: { textAlign: 'center', minWidth: '140px' },
  scoreValue: { fontSize: '36px', fontWeight: '800', color: '#1E3A5F' },
  scorePercent: { fontSize: '20px', color: '#666', marginBottom: '8px' },
  scoreBadge: { padding: '6px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '14px' },
  scoreStats: { display: 'flex', gap: '24px', flexWrap: 'wrap', flex: 1, justifyContent: 'center' },
  scoreStat: { textAlign: 'center' },
  scoreStatVal: { fontSize: '28px', fontWeight: '700', color: '#1E3A5F' },
  scoreStatLabel: { color: '#888', fontSize: '13px' },
  sectionTitle: { color: '#1E3A5F', fontSize: '18px', marginBottom: '16px' },
  questionCard: { backgroundColor: 'white', borderRadius: '10px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' },
  questionHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' },
  qNum: { backgroundColor: '#1E3A5F', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '700' },
  qStatus: { padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' },
  qMarks: { marginLeft: 'auto', color: '#666', fontSize: '13px', fontWeight: '600' },
  questionText: { color: '#333', fontSize: '15px', fontWeight: '500', marginBottom: '14px', lineHeight: '1.5' },
  optionsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  option: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px' },
  optId: { fontWeight: '700', color: '#1E3A5F', width: '20px', flexShrink: 0 },
  optText: { flex: 1, fontSize: '14px', color: '#333' },
  correctTag: { fontSize: '12px', color: '#276749', fontWeight: '700', flexShrink: 0 },
  wrongTag: { fontSize: '12px', color: '#9B2C2C', fontWeight: '700', flexShrink: 0 },
  tfReview: { backgroundColor: '#F7FAFC', borderRadius: '8px', padding: '14px', display: 'flex', gap: '20px', flexWrap: 'wrap' },
  tfItem: { fontSize: '14px', color: '#333' },
  doneBtn: { backgroundColor: '#1E3A5F', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', marginTop: '8px', marginBottom: '32px' }
};

export default ExamReview;