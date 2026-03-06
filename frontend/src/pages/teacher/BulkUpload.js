import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import API from '../../services/api';

function BulkUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('upload');
  const [dragOver, setDragOver] = useState(false);

  const parseExcel = (buffer) => {
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    return rows.map(row => {
      const type = (row.type || 'mcq').toLowerCase().trim();
      let options = [];
      if (type === 'mcq') {
        options = ['a', 'b', 'c', 'd']
          .filter(k => row[k])
          .map(k => ({ id: k, text: String(row[k]), is_correct: String(row.correct).toLowerCase() === k }));
      } else if (type === 'true_false') {
        options = [
          { id: 'true', text: 'True', is_correct: String(row.correct).toLowerCase() === 'true' },
          { id: 'false', text: 'False', is_correct: String(row.correct).toLowerCase() === 'false' }
        ];
      } else if (type === 'fill_blank') {
        options = [{ id: 'answer', text: String(row.correct || ''), is_correct: true }];
      } else if (type === 'short_answer' || type === 'essay') {
        options = [{ id: 'answer', text: String(row.correct || ''), is_correct: true }];
      }
      return {
        type,
        body: String(row.body || row.question || ''),
        marks: parseInt(row.marks) || 1,
        difficulty: (row.difficulty || 'medium').toLowerCase(),
        options
      };
    }).filter(q => q.body);
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj = {};
      headers.forEach((h, i) => obj[h] = values[i] || '');
      const type = (obj.type || 'mcq').toLowerCase();
      let options = [];
      if (type === 'mcq') {
        options = ['a','b','c','d'].filter(k => obj[k])
          .map(k => ({ id: k, text: obj[k], is_correct: obj.correct === k }));
      } else if (type === 'true_false') {
        options = [
          { id: 'true', text: 'True', is_correct: obj.correct === 'true' },
          { id: 'false', text: 'False', is_correct: obj.correct === 'false' }
        ];
      } else {
        options = [{ id: 'answer', text: obj.correct || '', is_correct: true }];
      }
      return { type, body: obj.body || '', marks: parseInt(obj.marks) || 1, difficulty: obj.difficulty || 'medium', options };
    }).filter(q => q.body);
  };

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setError('');
    setResult(null);
    try {
      let questions = [];
      if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
        const buffer = await f.arrayBuffer();
        questions = parseExcel(buffer);
      } else if (f.name.endsWith('.csv')) {
        const text = await f.text();
        questions = parseCSV(text);
      } else if (f.name.endsWith('.json')) {
        const text = await f.text();
        const parsed = JSON.parse(text);
        questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
      } else {
        setError('Only .xlsx, .csv or .json files are supported');
        return;
      }
      if (questions.length === 0) { setError('No valid questions found in file.'); return; }
      setPreview(questions);
    } catch (err) {
      setError('Failed to parse file. Check format and try again.');
    }
  };

  const handleFileChange = (e) => handleFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!preview.length) return;
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const res = await API.post('/questions/bulk-upload', { questions: preview });
      setResult(res.data);
      setFile(null);
      setPreview([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    }
    setUploading(false);
  };

  const downloadExcelTemplate = () => {
    const data = [
      { type: 'mcq', body: 'What is the capital of France?', marks: 2, difficulty: 'easy', a: 'London', b: 'Paris', c: 'Berlin', d: 'Rome', correct: 'b' },
      { type: 'mcq', body: 'Which planet is the largest?', marks: 1, difficulty: 'medium', a: 'Earth', b: 'Mars', c: 'Jupiter', d: 'Saturn', correct: 'c' },
      { type: 'true_false', body: 'The sun rises in the east.', marks: 1, difficulty: 'easy', a: '', b: '', c: '', d: '', correct: 'true' },
      { type: 'fill_blank', body: 'The chemical symbol for water is ___.', marks: 1, difficulty: 'easy', a: '', b: '', c: '', d: '', correct: 'H2O' },
      { type: 'short_answer', body: 'Explain Newton\'s first law of motion.', marks: 3, difficulty: 'medium', a: '', b: '', c: '', d: '', correct: 'An object at rest stays at rest unless acted on by a force.' },
      { type: 'essay', body: 'Discuss the causes of World War I.', marks: 10, difficulty: 'hard', a: '', b: '', c: '', d: '', correct: 'Key points: assassination, alliances, imperialism, nationalism.' }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    // Style column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 50 }, { wch: 8 }, { wch: 12 },
      { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');

    // Instructions sheet
    const instructions = [
      { Column: 'type', Description: 'Question type', Values: 'mcq, true_false, fill_blank, short_answer, essay' },
      { Column: 'body', Description: 'The question text', Values: 'Any text' },
      { Column: 'marks', Description: 'Marks for the question', Values: 'Number e.g. 1, 2, 5' },
      { Column: 'difficulty', Description: 'Question difficulty', Values: 'easy, medium, hard' },
      { Column: 'a', Description: 'MCQ option A', Values: 'Text (MCQ only)' },
      { Column: 'b', Description: 'MCQ option B', Values: 'Text (MCQ only)' },
      { Column: 'c', Description: 'MCQ option C', Values: 'Text (MCQ only)' },
      { Column: 'd', Description: 'MCQ option D', Values: 'Text (MCQ only)' },
      { Column: 'correct', Description: 'Correct answer', Values: 'a/b/c/d for MCQ, true/false for T/F, text for others' }
    ];
    const ws2 = XLSX.utils.json_to_sheet(instructions);
    ws2['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
    XLSX.writeFile(wb, 'questions_template.xlsx');
  };

  const downloadCSVTemplate = () => {
    const content = `type,body,marks,difficulty,a,b,c,d,correct
mcq,What is the capital of France?,2,easy,London,Paris,Berlin,Rome,b
mcq,Which planet is largest?,1,medium,Earth,Mars,Jupiter,Saturn,c
true_false,The sun rises in the east.,1,easy,,,,, true
fill_blank,The chemical symbol for water is ___.,1,easy,,,,,H2O
short_answer,Explain Newton's first law.,3,medium,,,,,Object at rest stays at rest
essay,Discuss the causes of World War I.,10,hard,,,,,Key points: alliances nationalism`;
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'questions_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const typeColors = { mcq: '#3182CE', true_false: '#38A169', fill_blank: '#D69E2E', short_answer: '#805AD5', essay: '#E07B20' };
  const typeLabels = { mcq: '🔘 MCQ', true_false: '✅ T/F', fill_blank: '✏️ Fill', short_answer: '📝 Short', essay: '📄 Essay' };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📤 Bulk Upload Questions</h1>
          <p style={styles.subtitle}>Upload multiple questions via Excel, CSV or JSON</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/teacher/question-bank')}>← Question Bank</button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['upload', 'template'].map(t => (
          <button key={t} style={{
            ...styles.tab,
            backgroundColor: mode === t ? '#1E3A5F' : 'white',
            color: mode === t ? 'white' : '#555'
          }} onClick={() => setMode(t)}>
            {t === 'upload' ? '📤 Upload File' : '📋 Download Template'}
          </button>
        ))}
      </div>

      {/* Upload Mode */}
      {mode === 'upload' && (
        <div style={styles.card}>
          {error && <div style={styles.alertError}>❌ {error}</div>}
          {result && (
            <div style={styles.alertSuccess}>
              ✅ {result.message}
              {result.errors?.length > 0 && (
                <div style={styles.errorList}>
                  <strong>Issues:</strong>
                  {result.errors.map((e, i) => <div key={i}>• {e}</div>)}
                </div>
              )}
            </div>
          )}

          {/* Drop Zone */}
          <div
            style={{
              ...styles.dropZone,
              borderColor: dragOver ? '#1E3A5F' : '#CBD5E0',
              backgroundColor: dragOver ? '#EBF8FF' : '#F7FAFC'
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>
              {dragOver ? '📂' : '📁'}
            </div>
            <p style={styles.dropText}>
              {dragOver ? 'Drop your file here!' : 'Drag & drop or click to select'}
            </p>
            <p style={styles.dropHint}>Supports: .xlsx (Excel) · .csv · .json · Max 500 questions</p>
            <input type="file" accept=".xlsx,.xls,.csv,.json"
              onChange={handleFileChange} style={{ display: 'none' }} id="fileInput" />
            <label htmlFor="fileInput" style={styles.chooseBtn}>📂 Choose File</label>
            {file && (
              <div style={styles.fileName}>
                📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                <span style={{ color: '#38A169', fontWeight: '700', marginLeft: '8px' }}>
                  ✓ {preview.length} questions detected
                </span>
              </div>
            )}
          </div>

          {/* Preview Table */}
          {preview.length > 0 && (
            <div style={styles.previewSection}>
              <div style={styles.previewHeader}>
                <h3 style={styles.previewTitle}>👁️ Preview — {preview.length} questions</h3>
                <button style={styles.clearBtn} onClick={() => { setFile(null); setPreview([]); }}>
                  ✕ Clear
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thead}>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Question</th>
                      <th style={styles.th}>Marks</th>
                      <th style={styles.th}>Difficulty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((q, i) => (
                      <tr key={i} style={styles.tr}>
                        <td style={styles.td}>{i + 1}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.typeBadge, backgroundColor: typeColors[q.type] || '#718096' }}>
                            {typeLabels[q.type] || q.type}
                          </span>
                        </td>
                        <td style={{ ...styles.td, maxWidth: '300px' }}>
                          <div style={styles.questionPreview}>{q.body}</div>
                        </td>
                        <td style={styles.td}>{q.marks}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.diffBadge,
                            backgroundColor: { easy: '#C6F6D5', medium: '#FEFCBF', hard: '#FED7D7' }[q.difficulty] || '#EDF2F7',
                            color: { easy: '#276749', medium: '#744210', hard: '#9B2C2C' }[q.difficulty] || '#4A5568'
                          }}>
                            {q.difficulty}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 10 && (
                <p style={styles.moreText}>...and {preview.length - 10} more questions</p>
              )}
              <button
                style={{ ...styles.uploadBtn, opacity: uploading ? 0.7 : 1 }}
                onClick={handleUpload} disabled={uploading}
              >
                {uploading ? '⏳ Uploading...' : `📤 Upload All ${preview.length} Questions`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Template Mode */}
      {mode === 'template' && (
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>📥 Download a Template</h3>
          <p style={styles.sectionDesc}>
            Fill the template with your questions and upload it. Follow the exact format shown.
          </p>

          <div style={styles.templateGrid}>
            <div style={{ ...styles.templateCard, borderTop: '4px solid #38A169' }}>
              <div style={{ fontSize: '44px', marginBottom: '12px' }}>📊</div>
              <h4 style={styles.templateTitle}>Excel Template (.xlsx)</h4>
              <p style={styles.templateDesc}>
                Best option! Includes Instructions sheet, column headers,
                and example rows for all 5 question types.
              </p>
              <button style={{ ...styles.downloadBtn, backgroundColor: '#38A169' }}
                onClick={downloadExcelTemplate}>
                ⬇️ Download Excel Template
              </button>
            </div>
            <div style={{ ...styles.templateCard, borderTop: '4px solid #3182CE' }}>
              <div style={{ fontSize: '44px', marginBottom: '12px' }}>📄</div>
              <h4 style={styles.templateTitle}>CSV Template (.csv)</h4>
              <p style={styles.templateDesc}>
                Simple format for Google Sheets or basic spreadsheet apps.
                All question types supported.
              </p>
              <button style={{ ...styles.downloadBtn, backgroundColor: '#3182CE' }}
                onClick={downloadCSVTemplate}>
                ⬇️ Download CSV Template
              </button>
            </div>
          </div>

          {/* Format Guide */}
          <div style={styles.formatGuide}>
            <h4 style={styles.guideTitle}>📖 Column Reference</h4>
            <div style={styles.guideGrid}>
              {[
                { col: 'type', desc: 'mcq · true_false · fill_blank · short_answer · essay' },
                { col: 'body', desc: 'The full question text' },
                { col: 'marks', desc: 'Points for this question (e.g. 1, 2, 5)' },
                { col: 'difficulty', desc: 'easy · medium · hard' },
                { col: 'a, b, c, d', desc: 'MCQ options (leave blank for other types)' },
                { col: 'correct', desc: 'a/b/c/d for MCQ · true/false · answer text for others' }
              ].map((g, i) => (
                <div key={i} style={styles.guideItem}>
                  <div style={styles.guideLabel}>{g.col}</div>
                  <div style={styles.guideValue}>{g.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Question Type Examples */}
          <div style={{ marginTop: '20px' }}>
            <h4 style={styles.guideTitle}>💡 Question Type Tips</h4>
            <div style={styles.tipsGrid}>
              {[
                { type: 'MCQ', color: '#3182CE', tip: 'Fill columns a, b, c, d with options. Set correct to the letter of the right answer (a, b, c or d).' },
                { type: 'True/False', color: '#38A169', tip: 'Leave a,b,c,d blank. Set correct to "true" or "false".' },
                { type: 'Fill Blank', color: '#D69E2E', tip: 'Leave a,b,c,d blank. Set correct to the exact answer text.' },
                { type: 'Short Answer', color: '#805AD5', tip: 'Leave a,b,c,d blank. Set correct to the model answer for teacher reference.' },
                { type: 'Essay', color: '#E07B20', tip: 'Leave a,b,c,d blank. Set correct to marking guide / key points.' }
              ].map((t, i) => (
                <div key={i} style={{ ...styles.tipItem, borderLeft: `3px solid ${t.color}` }}>
                  <span style={{ ...styles.tipType, color: t.color }}>{t.type}</span>
                  <span style={styles.tipText}>{t.tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '960px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
  tab: { padding: '10px 20px', border: '1px solid #DDD', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' },
  card: { backgroundColor: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  alertError: { backgroundColor: '#FFF5F5', color: '#C53030', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #E53E3E', fontSize: '14px' },
  alertSuccess: { backgroundColor: '#F0FFF4', color: '#276749', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #38A169', fontSize: '14px' },
  errorList: { marginTop: '8px', fontSize: '13px' },
  dropZone: { border: '2px dashed', borderRadius: '14px', padding: '48px 20px', textAlign: 'center', marginBottom: '20px', transition: 'all 0.2s', cursor: 'pointer' },
  dropText: { color: '#333', fontSize: '17px', fontWeight: '700', marginBottom: '6px' },
  dropHint: { color: '#888', fontSize: '13px', marginBottom: '20px' },
  chooseBtn: { display: 'inline-block', backgroundColor: '#1E3A5F', color: 'white', padding: '10px 28px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  fileName: { marginTop: '14px', color: '#555', fontSize: '14px' },
  previewSection: { marginTop: '8px' },
  previewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  previewTitle: { color: '#1E3A5F', fontSize: '15px', fontWeight: '700' },
  clearBtn: { backgroundColor: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '500px' },
  thead: { backgroundColor: '#1E3A5F' },
  th: { padding: '10px 12px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' },
  tr: { borderBottom: '1px solid #F0F4F8' },
  td: { padding: '10px 12px', fontSize: '13px', color: '#333', verticalAlign: 'middle' },
  typeBadge: { color: 'white', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' },
  diffBadge: { padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' },
  questionPreview: { color: '#333', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' },
  moreText: { color: '#888', fontSize: '13px', textAlign: 'center', padding: '8px', fontStyle: 'italic' },
  uploadBtn: { width: '100%', backgroundColor: '#38A169', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: '700', marginTop: '16px', transition: 'all 0.2s' },
  sectionTitle: { color: '#1E3A5F', fontSize: '18px', marginBottom: '8px', fontWeight: '700' },
  sectionDesc: { color: '#666', fontSize: '14px', marginBottom: '24px' },
  templateGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' },
  templateCard: { backgroundColor: '#F7FAFC', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #E2E8F0' },
  templateTitle: { color: '#1E3A5F', fontSize: '16px', marginBottom: '8px', fontWeight: '700' },
  templateDesc: { color: '#666', fontSize: '13px', marginBottom: '16px', lineHeight: '1.6' },
  downloadBtn: { color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', width: '100%', transition: 'all 0.2s' },
  formatGuide: { backgroundColor: '#F7FAFC', borderRadius: '10px', padding: '16px', border: '1px solid #E2E8F0', marginTop: '8px' },
  guideTitle: { color: '#1E3A5F', fontSize: '15px', marginBottom: '12px', fontWeight: '700' },
  guideGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' },
  guideItem: { backgroundColor: 'white', borderRadius: '8px', padding: '10px 12px', border: '1px solid #EEE' },
  guideLabel: { color: '#1E3A5F', fontWeight: '700', fontSize: '13px', marginBottom: '4px', fontFamily: 'monospace' },
  guideValue: { color: '#555', fontSize: '12px', lineHeight: '1.4' },
  tipsGrid: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' },
  tipItem: { backgroundColor: '#F7FAFC', borderRadius: '8px', padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' },
  tipType: { fontWeight: '700', fontSize: '13px', flexShrink: 0, minWidth: '90px' },
  tipText: { color: '#555', fontSize: '13px', lineHeight: '1.4' }
};

export default BulkUpload;