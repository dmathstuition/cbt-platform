import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

function ExamReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedHints, setExpandedHints] = useState({});

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

  const toggleHint = (qId) => setExpandedHints(p => ({ ...p, [qId]: !p[qId] }));

  if (loading) return (
    <div style={styles.center}>
      <div style={styles.loadingSpinner}>⏳</div>
      <p style={{ color: '#666', marginTop: '12px' }}>Loading your review...</p>
    </div>
  );
  if (!review) return (
    <div style={styles.center}>
      <div style={{ fontSize: '48px' }}>📭</div>
      <p style={{ color: '#666', marginTop: '12px' }}>Review not available.</p>
    </div>
  );

  const { session, exam, questions } = review;
  const percentage = exam.total_marks > 0
    ? ((session.score / exam.total_marks) * 100).toFixed(1) : 0;
  const passed = parseFloat(percentage) >= exam.pass_mark;
  const correct = questions.filter(q => q.is_correct).length;
  const wrong = questions.filter(q => !q.is_correct && q.student_answer).length;
  const skipped = questions.filter(q => !q.student_answer).length;

  const pieData = [
    { name: 'Correct', value: correct, color: '#38A169' },
    { name: 'Wrong', value: wrong, color: '#E53E3E' },
    { name: 'Skipped', value: skipped, color: '#D69E2E' }
  ].filter(d => d.value > 0);

  const filtered = questions.filter(q => {
    if (filter === 'correct') return q.is_correct;
    if (filter === 'wrong') return !q.is_correct && q.student_answer;
    if (filter === 'skipped') return !q.student_answer;
    return true;
  });

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📋 Exam Review</h1>
          <p style={styles.subtitle}>{exam.title}</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/student/results')}>
          ← My Results
        </button>
      </div>

      {/* Score Banner */}
      <div style={{
        ...styles.scoreBanner,
        background: passed
          ? 'linear-gradient(135deg, #1A4731, #276749)'
          : 'linear-gradient(135deg, #742A2A, #C53030)'
      }}>
        <div style={styles.scoreLeft}>
          <div style={styles.scoreCircle}>
            <div style={styles.scoreValue}>{percentage}%</div>
            <div style={styles.scoreLabel}>Score</div>
          </div>
        </div>
        <div style={styles.scoreMiddle}>
          <div style={styles.examTitleWhite}>{exam.title}</div>
          <div style={styles.scoreFraction}>{session.score} / {exam.total_marks} marks</div>
          <div style={{
            ...styles.resultPill,
            backgroundColor: passed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.2)'
          }}>
            {passed ? '🎉 PASSED' : '😔 FAILED'} · Pass mark: {exam.pass_mark}%
          </div>
          {/* Progress Bar */}
          <div style={styles.progressBg}>
            <div style={{
              ...styles.progressFill,
              width: `${percentage}%`,
              backgroundColor: passed ? '#68D391' : '#FC8181'
            }} />
          </div>
        </div>
        <div style={styles.scoreRight}>
          <div style={styles.miniStat}>
            <span style={{ ...styles.miniVal, color: '#68D391' }}>{correct}</span>
            <span style={styles.miniLabel}>Correct</span>
          </div>
          <div style={styles.miniStat}>
            <span style={{ ...styles.miniVal, color: '#FC8181' }}>{wrong}</span>
            <span style={styles.miniLabel}>Wrong</span>
          </div>
          <div style={styles.miniStat}>
            <span style={{ ...styles.miniVal, color: '#FAD080' }}>{skipped}</span>
            <span style={styles.miniLabel}>Skipped</span>
          </div>
        </div>
      </div>

      {/* Analytics Row */}
      <div style={styles.analyticsRow}>
        {/* Pie Chart */}
        <div style={styles.pieCard}>
          <h3 style={styles.cardTitle}>📊 Score Breakdown</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                dataKey="value" paddingAngle={3}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} questions`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={styles.pieLegend}>
            {pieData.map((d, i) => (
              <div key={i} style={styles.legendItem}>
                <div style={{ ...styles.legendDot, backgroundColor: d.color }} />
                <span style={styles.legendText}>{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Tips */}
        <div style={styles.tipsCard}>
          <h3 style={styles.cardTitle}>💡 Performance Tips</h3>
          {parseFloat(percentage) === 100 && (
            <div style={styles.tip}>🏆 Perfect score! Outstanding performance!</div>
          )}
          {parseFloat(percentage) >= 80 && parseFloat(percentage) < 100 && (
            <div style={styles.tip}>⭐ Excellent work! Review the {wrong} wrong answers to perfect your score.</div>
          )}
          {parseFloat(percentage) >= exam.pass_mark && parseFloat(percentage) < 80 && (
            <div style={styles.tip}>✅ You passed! Focus on the topics you got wrong to improve further.</div>
          )}
          {parseFloat(percentage) < exam.pass_mark && (
            <div style={{ ...styles.tip, backgroundColor: '#FFF5F5', borderColor: '#FC8181', color: '#C53030' }}>
              📚 Review all wrong answers carefully. Practice similar questions to improve.
            </div>
          )}
          {skipped > 0 && (
            <div style={{ ...styles.tip, backgroundColor: '#FFFBEB', borderColor: '#FAD080', color: '#744210' }}>
              ⚠️ You skipped {skipped} question(s). Always attempt every question!
            </div>
          )}
          <div style={styles.accuracyBar}>
            <div style={styles.accuracyLabel}>
              <span>Accuracy</span>
              <span style={{ fontWeight: '700' }}>
                {questions.length > 0 ? ((correct / questions.length) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div style={styles.accuracyBg}>
              <div style={{
                ...styles.accuracyFill,
                width: `${questions.length > 0 ? (correct / questions.length) * 100 : 0}%`
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterRow}>
        <h2 style={styles.sectionTitle}>Question by Question</h2>
        <div style={styles.filterBtns}>
          {[
            { key: 'all', label: `All (${questions.length})` },
            { key: 'correct', label: `✅ Correct (${correct})` },
            { key: 'wrong', label: `❌ Wrong (${wrong})` },
            { key: 'skipped', label: `⚠️ Skipped (${skipped})` }
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              ...styles.filterBtn,
              backgroundColor: filter === f.key ? '#1E3A5F' : 'white',
              color: filter === f.key ? 'white' : '#555',
              border: `1px solid ${filter === f.key ? '#1E3A5F' : '#DDD'}`
            }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Questions */}
      {filtered.length === 0 ? (
        <div style={styles.emptyFilter}>
          <p>No questions in this category.</p>
        </div>
      ) : (
        filtered.map((q, i) => {
          const status = q.is_correct ? 'correct' : q.student_answer ? 'wrong' : 'skipped';
          const borderColor = { correct: '#38A169', wrong: '#E53E3E', skipped: '#D69E2E' }[status];
          const statusBg = { correct: '#C6F6D5', wrong: '#FED7D7', skipped: '#FEFCBF' }[status];
          const statusColor = { correct: '#276749', wrong: '#9B2C2C', skipped: '#744210' }[status];
          const statusLabel = { correct: '✅ Correct', wrong: '❌ Wrong', skipped: '⚠️ Skipped' }[status];

          return (
            <div key={q.id} style={{ ...styles.questionCard, borderLeft: `5px solid ${borderColor}` }}>
              {/* Question Header */}
              <div style={styles.questionHeader}>
                <div style={{ ...styles.qNum, backgroundColor: borderColor }}>Q{i + 1}</div>
                <span style={{ ...styles.qStatus, backgroundColor: statusBg, color: statusColor }}>
                  {statusLabel}
                </span>
                <span style={styles.qType}>{q.type}</span>
                <span style={styles.qMarks}>{q.marks_awarded || 0}/{q.marks} marks</span>
              </div>

              <p style={styles.questionText}>{q.body}</p>

              {/* MCQ Options */}
              {q.type === 'mcq' && q.options && (
                <div style={styles.optionsList}>
                  {q.options.map(opt => {
                    const isCorrect = opt.is_correct;
                    const isStudent = q.student_answer === opt.id;
                    let bg = '#F7FAFC', border = '#E2E8F0', textColor = '#555';
                    if (isCorrect) { bg = '#F0FFF4'; border = '#38A169'; textColor = '#276749'; }
                    if (isStudent && !isCorrect) { bg = '#FFF5F5'; border = '#E53E3E'; textColor = '#9B2C2C'; }
                    return (
                      <div key={opt.id} style={{ ...styles.option, backgroundColor: bg, border: `1.5px solid ${border}` }}>
                        <span style={{ ...styles.optId, backgroundColor: isCorrect ? '#38A169' : isStudent ? '#E53E3E' : '#E2E8F0', color: (isCorrect || isStudent) ? 'white' : '#555' }}>
                          {opt.id.toUpperCase()}
                        </span>
                        <span style={{ ...styles.optText, color: textColor }}>{opt.text}</span>
                        {isCorrect && <span style={styles.correctTag}>✅ Correct Answer</span>}
                        {isStudent && !isCorrect && <span style={styles.wrongTag}>👆 Your Answer</span>}
                        {isStudent && isCorrect && <span style={styles.correctTag}>👆 Your Answer ✅</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* True/False */}
              {q.type === 'true_false' && (
                <div style={styles.answerBox}>
                  <div style={styles.answerRow}>
                    <span style={styles.answerLabel}>Your answer:</span>
                    <span style={{ fontWeight: '700', color: q.is_correct ? '#38A169' : '#E53E3E' }}>
                      {q.student_answer ? q.student_answer.toUpperCase() : 'Not answered'}
                    </span>
                  </div>
                  <div style={styles.answerRow}>
                    <span style={styles.answerLabel}>Correct answer:</span>
                    <span style={{ fontWeight: '700', color: '#38A169' }}>
                      {q.options?.find(o => o.is_correct)?.id?.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              {/* Fill in Blank */}
              {q.type === 'fill_blank' && (
                <div style={styles.answerBox}>
                  <div style={styles.answerRow}>
                    <span style={styles.answerLabel}>Your answer:</span>
                    <span style={{ fontWeight: '700', color: q.is_correct ? '#38A169' : '#E53E3E' }}>
                      {q.student_answer || 'Not answered'}
                    </span>
                  </div>
                  <div style={styles.answerRow}>
                    <span style={styles.answerLabel}>Correct answer:</span>
                    <span style={{ fontWeight: '700', color: '#38A169' }}>
                      {q.options?.[0]?.text}
                    </span>
                  </div>
                </div>
              )}

              {/* Short Answer / Essay */}
              {(q.type === 'short_answer' || q.type === 'essay') && (
                <div style={styles.answerBox}>
                  <div style={styles.answerLabel}>Your answer:</div>
                  <div style={{ ...styles.essayAnswer, borderColor: q.is_correct ? '#38A169' : '#E2E8F0' }}>
                    {q.student_answer || <span style={{ color: '#999', fontStyle: 'italic' }}>Not answered</span>}
                  </div>
                  {q.options?.[0]?.text && (
                    <div>
                      <button onClick={() => toggleHint(q.id)} style={styles.hintBtn}>
                        {expandedHints[q.id] ? '▲ Hide' : '▼ Show'} Model Answer
                      </button>
                      {expandedHints[q.id] && (
                        <div style={styles.modelAnswer}>
                          <strong>Model Answer:</strong> {q.options[0].text}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ ...styles.gradingNote, color: '#744210', backgroundColor: '#FFFBEB', border: '1px solid #FAD080' }}>
                    📝 This answer is marked by your teacher
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      <button style={styles.doneBtn} onClick={() => navigate('/student/results')}>
        ← Back to My Results
      </button>
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
  loadingSpinner: { fontSize: '48px', animation: 'spin 1s linear infinite' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  scoreBanner: { borderRadius: '16px', padding: '24px', marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
  scoreLeft: { display: 'flex', justifyContent: 'center' },
  scoreCircle: { width: '90px', height: '90px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', border: '3px solid rgba(255,255,255,0.4)' },
  scoreValue: { fontSize: '22px', fontWeight: '800', color: 'white', lineHeight: 1 },
  scoreLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' },
  scoreMiddle: { flex: 1, minWidth: '200px' },
  examTitleWhite: { fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '4px' },
  scoreFraction: { fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' },
  resultPill: { display: 'inline-block', padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', marginBottom: '12px' },
  progressBg: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '99px', height: '8px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '99px', transition: 'width 0.8s ease' },
  scoreRight: { display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' },
  miniStat: { textAlign: 'center' },
  miniVal: { display: 'block', fontSize: '28px', fontWeight: '800', lineHeight: 1 },
  miniLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' },
  analyticsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' },
  pieCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  tipsCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  cardTitle: { color: '#1E3A5F', fontSize: '15px', fontWeight: '700', marginBottom: '12px' },
  pieLegend: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '8px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px' },
  legendDot: { width: '10px', height: '10px', borderRadius: '50%' },
  legendText: { fontSize: '12px', color: '#555' },
  tip: { backgroundColor: '#F0FFF4', border: '1px solid #68D391', color: '#276749', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '10px', lineHeight: '1.5' },
  accuracyBar: { marginTop: '12px' },
  accuracyLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#555', marginBottom: '6px' },
  accuracyBg: { backgroundColor: '#EEE', borderRadius: '99px', height: '8px', overflow: 'hidden' },
  accuracyFill: { height: '100%', backgroundColor: '#38A169', borderRadius: '99px', transition: 'width 0.8s ease' },
  filterRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
  sectionTitle: { color: '#1E3A5F', fontSize: '18px', fontWeight: '700' },
  filterBtns: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  filterBtn: { padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' },
  emptyFilter: { textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  questionCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s' },
  questionHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' },
  qNum: { color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' },
  qStatus: { padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' },
  qType: { backgroundColor: '#EBF8FF', color: '#2B6CB0', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' },
  qMarks: { marginLeft: 'auto', color: '#666', fontSize: '13px', fontWeight: '600' },
  questionText: { color: '#333', fontSize: '15px', fontWeight: '500', marginBottom: '14px', lineHeight: '1.6' },
  optionsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  option: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', transition: 'all 0.2s' },
  optId: { fontWeight: '700', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 },
  optText: { flex: 1, fontSize: '14px' },
  correctTag: { fontSize: '11px', color: '#276749', fontWeight: '700', backgroundColor: '#C6F6D5', padding: '2px 8px', borderRadius: '10px', flexShrink: 0 },
  wrongTag: { fontSize: '11px', color: '#9B2C2C', fontWeight: '700', backgroundColor: '#FED7D7', padding: '2px 8px', borderRadius: '10px', flexShrink: 0 },
  answerBox: { backgroundColor: '#F7FAFC', borderRadius: '10px', padding: '16px' },
  answerRow: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' },
  answerLabel: { color: '#666', fontSize: '13px', fontWeight: '600', minWidth: '110px' },
  essayAnswer: { backgroundColor: 'white', border: '1.5px solid', borderRadius: '8px', padding: '12px', fontSize: '14px', color: '#333', lineHeight: '1.6', marginTop: '8px', marginBottom: '10px', minHeight: '60px' },
  hintBtn: { backgroundColor: '#EBF8FF', color: '#2B6CB0', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginBottom: '8px' },
  modelAnswer: { backgroundColor: '#F0FFF4', border: '1px solid #68D391', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#276749', marginBottom: '8px', lineHeight: '1.5' },
  gradingNote: { padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' },
  doneBtn: { backgroundColor: '#1E3A5F', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', marginTop: '8px', marginBottom: '32px' }
};

export default ExamReview;