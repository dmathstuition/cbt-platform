import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionAPI } from '../../services/api';

function TakeExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [timeWarning, setTimeWarning] = useState(false);

  useEffect(() => {
    if (!session || result) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    if (timeLeft <= 300 && !timeWarning) setTimeWarning(true);
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [session, timeLeft, result, handleSubmit]);

  const startExam = async () => {
    try {
      const res = await sessionAPI.start(id);
      setSession(res.data.session_id);
      setQuestions(res.data.questions);
      setTimeLeft(res.data.time_remaining_sec);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start exam');
      setLoading(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await sessionAPI.submit(session);
      setResult(res.data.result);
    } catch (err) {
      alert('Failed to submit exam');
    }
    setSubmitting(false);
  }, [session, submitting]);

  // Countdown timer
  useEffect(() => {
    if (!session || result) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [session, timeLeft, result, handleSubmit]);

 const handleAnswer = async (questionId, value, type = 'selected') => {
    setAnswers({ ...answers, [questionId]: value });
    try {
      const answer = type === 'text'
        ? { text: value }
        : { selectedId: value };
      await sessionAPI.saveAnswer({
        session_id: session,
        question_id: questionId,
        answer
      });
    } catch (err) {
      console.error('Failed to save answer');
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) return <div style={styles.center}><p>Starting exam...</p></div>;
  if (error) return <div style={styles.center}><p style={{color:'red'}}>{error}</p></div>;

  if (result) {
    return (
      <div style={styles.center}>
        <div style={styles.resultCard}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>
            {result.passed ? '🎉' : '😔'}
          </div>
          <h1 style={{ color: '#1E3A5F', marginBottom: '8px' }}>
            {result.passed ? 'Congratulations!' : 'Better Luck Next Time'}
          </h1>
          <div style={styles.scoreBox}>
            <div style={styles.scoreItem}>
              <span style={styles.scoreLabel}>Score</span>
              <span style={styles.scoreValue}>{result.score}/{result.total_marks}</span>
            </div>
            <div style={styles.scoreItem}>
              <span style={styles.scoreLabel}>Percentage</span>
              <span style={styles.scoreValue}>{result.percentage}%</span>
            </div>
            <div style={styles.scoreItem}>
              <span style={styles.scoreLabel}>Result</span>
              <span style={{
                ...styles.scoreValue,
                color: result.passed ? '#38A169' : '#E53E3E'
              }}>
                {result.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
          </div>
          <button
            style={styles.btn}
            onClick={() => navigate('/student/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const question = questions[current];

  return (
    <div style={styles.examContainer}>
      {/* Timer & Progress Bar */}
      <div style={styles.topBar}>
        <div style={styles.progress}>
          Question {current + 1} of {questions.length}
        </div>
        <div style={{
          ...styles.timer,
          backgroundColor: timeLeft < 60 ? '#E53E3E' : '#1E3A5F'
        }}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {timeWarning && !result && (
        <div style={styles.warningBanner}>
          ⚠️ Less than 5 minutes remaining! Your exam will auto-submit when time runs out.
        </div>
      )}

      <div style={styles.examBody}>
        {/* Question Navigation */}
        <div style={styles.sidebar}>
          <p style={styles.sidebarTitle}>Questions</p>
          <div style={styles.navGrid}>
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrent(i)}
                style={{
                  ...styles.navBtn,
                  backgroundColor:
                    i === current ? '#1E3A5F' :
                    answers[q.id] ? '#38A169' : '#EEE',
                  color: (i === current || answers[q.id]) ? 'white' : '#333'
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div style={styles.legend}>
            <span style={styles.legendItem}>
              <span style={{...styles.dot, backgroundColor: '#38A169'}}></span> Answered
            </span>
            <span style={styles.legendItem}>
              <span style={{...styles.dot, backgroundColor: '#EEE'}}></span> Unanswered
            </span>
          </div>
          <button
            style={{...styles.btn, width: '100%', marginTop: '16px'}}
            onClick={() => {
              if (window.confirm('Are you sure you want to submit?')) handleSubmit();
            }}
          >
            Submit Exam
          </button>
        </div>

        {/* Question Area */}
        <div style={styles.questionArea}>
          <div style={styles.questionCard}>
            <p style={styles.questionMeta}>
              Question {current + 1} • {question.marks} mark(s) • {question.difficulty || 'medium'}
            </p>
            <h2 style={styles.questionBody}>{question.body}</h2>
            
            <div style={styles.options}>
              {/* MCQ and True/False */}
              {(question.type === 'mcq' || question.type === 'true_false') &&
                question.options && question.options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleAnswer(question.id, opt.id)}
                    style={{
                      ...styles.optionBtn,
                      backgroundColor: answers[question.id] === opt.id ? '#1E3A5F' : 'white',
                      color: answers[question.id] === opt.id ? 'white' : '#333',
                      borderColor: answers[question.id] === opt.id ? '#1E3A5F' : '#DDD'
                    }}
                  >
                    <span style={styles.optionLetter}>{opt.id.toUpperCase()}</span>
                    {opt.text}
                  </button>
                ))
              }

              {/* Fill in the Blank */}
              {question.type === 'fill_blank' && (
                <div style={styles.fillBlank}>
                  <p style={styles.fillHint}>Type your answer below:</p>
                  <input
                    style={styles.fillInput}
                    placeholder="Your answer..."
                    value={answers[question.id] || ''}
                    onChange={e => {
                      setAnswers({...answers, [question.id]: e.target.value});
                      handleAnswer(question.id, e.target.value, 'text');
                    }}
                  />
                </div>
              )}
            </div>

            <div style={styles.navButtons}>
              <button
                style={{...styles.navArrow, opacity: current === 0 ? 0.4 : 1}}
                disabled={current === 0}
                onClick={() => setCurrent(current - 1)}
              >
                ← Previous
              </button>
              <button
                style={{...styles.navArrow, opacity: current === questions.length - 1 ? 0.4 : 1}}
                disabled={current === questions.length - 1}
                onClick={() => setCurrent(current + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  center: {
    minHeight: '80vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center'
  },
  resultCard: {
    backgroundColor: 'white', borderRadius: '16px',
    padding: '48px', textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: '500px'
  },
  scoreBox: {
    display: 'flex', justifyContent: 'space-around',
    backgroundColor: '#F7FAFC', borderRadius: '12px',
    padding: '24px', margin: '24px 0'
  },
  scoreItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  scoreLabel: { color: '#666', fontSize: '14px', marginBottom: '8px' },
  scoreValue: { color: '#1E3A5F', fontSize: '24px', fontWeight: 'bold' },
  examContainer: { display: 'flex', flexDirection: 'column', height: '100vh' },
  topBar: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '12px 24px',
    backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
  },
  progress: { color: '#666', fontSize: '14px' },
  timer: {
    color: 'white', padding: '8px 20px',
    borderRadius: '20px', fontWeight: 'bold', fontSize: '18px'
  },
  examBody: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: {
    width: '220px', backgroundColor: 'white',
    padding: '20px', borderRight: '1px solid #EEE',
    overflowY: 'auto'
  },
  sidebarTitle: { fontWeight: 'bold', color: '#333', marginBottom: '12px' },
  navGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px'
  },
  navBtn: {
    padding: '8px', border: 'none', borderRadius: '6px',
    cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'
  },
  legend: { marginTop: '12px', fontSize: '12px', color: '#666' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' },
  dot: { width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block' },
  questionArea: { flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#F0F4F8' },
  questionCard: {
    backgroundColor: 'white', borderRadius: '12px',
    padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  questionMeta: { color: '#888', fontSize: '13px', marginBottom: '12px' },
  questionBody: { color: '#1E3A5F', fontSize: '20px', marginBottom: '24px', lineHeight: '1.5' },
  options: { display: 'flex', flexDirection: 'column', gap: '12px' },
  optionBtn: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '14px 18px', border: '2px solid', borderRadius: '8px',
    cursor: 'pointer', fontSize: '16px', textAlign: 'left', transition: 'all 0.2s'
  },
  optionLetter: {
    width: '28px', height: '28px', borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.3)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0
  },
  navButtons: { display: 'flex', justifyContent: 'space-between', marginTop: '24px' },
  navArrow: {
    backgroundColor: '#1E3A5F', color: 'white', border: 'none',
    padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
  },
  btn: {
    backgroundColor: '#1E3A5F', color: 'white', border: 'none',
    padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px'
  },
  fillBlank: { padding: '8px 0' },

 fillHint: { color: '#666', marginBottom: '12px' },
  fillInput: {
    width: '100%', padding: '14px', fontSize: '16px',
    border: '2px solid #1E3A5F', borderRadius: '8px',
    boxSizing: 'border-box'
  },
  warningBanner: {
    backgroundColor: '#FFF5F5', color: '#C53030',
    padding: '10px 24px', textAlign: 'center',
    fontWeight: '600', fontSize: '14px',
    borderBottom: '2px solid #E53E3E'
  },
};

export default TakeExam;