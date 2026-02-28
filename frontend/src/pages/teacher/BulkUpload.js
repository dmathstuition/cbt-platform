import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';

function BulkUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('upload'); // upload | template

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setError('');
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        let questions = [];

        if (f.name.endsWith('.json')) {
          questions = JSON.parse(text);
          if (!Array.isArray(questions)) questions = questions.questions || [];
        } else if (f.name.endsWith('.csv')) {
          questions = parseCSV(text);
        } else {
          setError('Only .json or .csv files are supported');
          return;
        }

        setPreview(questions.slice(0, 5));
      } catch (err) {
        setError('Failed to parse file. Check format and try again.');
      }
    };
    reader.readAsText(f);
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj = {};
      headers.forEach((h, i) => obj[h] = values[i]);

      // Build options for MCQ from CSV columns a,b,c,d,correct
      if (obj.type === 'mcq') {
        obj.options = ['a', 'b', 'c', 'd']
          .filter(k => obj[k])
          .map(k => ({ id: k, text: obj[k], is_correct: obj.correct === k }));
      } else if (obj.type === 'true_false') {
        obj.options = [
          { id: 'true', text: 'True', is_correct: obj.correct === 'true' },
          { id: 'false', text: 'False', is_correct: obj.correct === 'false' }
        ];
      } else if (obj.type === 'fill_blank') {
        obj.options = [{ id: 'answer', text: obj.correct || '' }];
      }

      obj.marks = parseInt(obj.marks) || 1;
      return obj;
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setResult(null);

    try {
      const text = await file.text();
      let questions = [];

      if (file.name.endsWith('.json')) {
        questions = JSON.parse(text);
        if (!Array.isArray(questions)) questions = questions.questions || [];
      } else {
        questions = parseCSV(text);
      }

      const res = await API.post('/questions/bulk-upload', { questions });
      setResult(res.data);
      setFile(null);
      setPreview([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    }
    setUploading(false);
  };

  const downloadTemplate = (type) => {
    let content, filename, mimeType;

    if (type === 'json') {
      const template = [
        {
          type: 'mcq',
          body: 'What is the capital of France?',
          marks: 2,
          difficulty: 'easy',
          options: [
            { id: 'a', text: 'London', is_correct: false },
            { id: 'b', text: 'Paris', is_correct: true },
            { id: 'c', text: 'Berlin', is_correct: false },
            { id: 'd', text: 'Rome', is_correct: false }
          ]
        },
        {
          type: 'true_false',
          body: 'The sun rises in the east.',
          marks: 1,
          difficulty: 'easy',
          options: [
            { id: 'true', text: 'True', is_correct: true },
            { id: 'false', text: 'False', is_correct: false }
          ]
        },
        {
          type: 'fill_blank',
          body: 'The chemical symbol for water is ___.',
          marks: 1,
          difficulty: 'easy',
          options: [{ id: 'answer', text: 'H2O' }]
        }
      ];
      content = JSON.stringify(template, null, 2);
      filename = 'questions_template.json';
      mimeType = 'application/json';
    } else {
      content = `type,body,marks,difficulty,a,b,c,d,correct
mcq,What is the capital of France?,2,easy,London,Paris,Berlin,Rome,b
mcq,Which planet is largest?,1,medium,Earth,Mars,Jupiter,Saturn,c
true_false,The sun rises in the east.,1,easy,,,,, true
fill_blank,The chemical symbol for water is ___.,1,easy,,,,,H2O`;
      filename = 'questions_template.csv';
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeColors = { mcq: '#3182CE', true_false: '#38A169', fill_blank: '#D69E2E' };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📤 Bulk Upload Questions</h1>
          <p style={styles.subtitle}>Upload multiple questions at once using CSV or JSON</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/teacher/question-bank')}>
          ← Question Bank
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={{
          ...styles.tab,
          backgroundColor: mode === 'upload' ? '#1E3A5F' : 'white',
          color: mode === 'upload' ? 'white' : '#333'
        }} onClick={() => setMode('upload')}>
          📤 Upload File
        </button>
        <button style={{
          ...styles.tab,
          backgroundColor: mode === 'template' ? '#1E3A5F' : 'white',
          color: mode === 'template' ? 'white' : '#333'
        }} onClick={() => setMode('template')}>
          📋 Download Template
        </button>
      </div>

      {/* Upload Mode */}
      {mode === 'upload' && (
        <div style={styles.card}>
          {error && <div style={styles.alertError}>{error}</div>}
          {result && (
            <div style={styles.alertSuccess}>
              ✅ {result.message}
              {result.errors && result.errors.length > 0 && (
                <div style={styles.errorList}>
                  <strong>Errors:</strong>
                  {result.errors.map((e, i) => <div key={i}>• {e}</div>)}
                </div>
              )}
            </div>
          )}

          {/* Drop Zone */}
          <div style={styles.dropZone}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
            <p style={styles.dropText}>Select a CSV or JSON file</p>
            <p style={styles.dropHint}>Max 500 questions per upload</p>
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileChange}
              style={styles.fileInput}
              id="fileInput"
            />
            <label htmlFor="fileInput" style={styles.chooseBtn}>
              Choose File
            </label>
            {file && (
              <div style={styles.fileName}>
                📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div style={styles.preview}>
              <h3 style={styles.previewTitle}>
                Preview (first {preview.length} questions)
              </h3>
              {preview.map((q, i) => (
                <div key={i} style={styles.previewItem}>
                  <div style={styles.previewHeader}>
                    <span style={styles.previewNum}>Q{i + 1}</span>
                    <span style={{
                      ...styles.typeBadge,
                      backgroundColor: typeColors[q.type] || '#718096'
                    }}>
                      {q.type}
                    </span>
                    <span style={styles.marksBadge}>{q.marks || 1} mark(s)</span>
                  </div>
                  <p style={styles.previewBody}>{q.body}</p>
                </div>
              ))}
            </div>
          )}

          {file && (
            <button
              style={{ ...styles.uploadBtn, opacity: uploading ? 0.7 : 1 }}
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? '⏳ Uploading...' : '📤 Upload Questions'}
            </button>
          )}
        </div>
      )}

      {/* Template Mode */}
      {mode === 'template' && (
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Download a template to get started</h3>
          <p style={styles.sectionDesc}>
            Fill in the template with your questions and upload it. 
            Make sure to follow the exact format shown.
          </p>

          <div style={styles.templateGrid}>
            {/* JSON Template */}
            <div style={styles.templateCard}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>{ }</div>
              <h4 style={styles.templateTitle}>JSON Format</h4>
              <p style={styles.templateDesc}>
                Best for complex questions with full option control.
                Supports MCQ, True/False and Fill in the Blank.
              </p>
              <button style={{...styles.downloadBtn, backgroundColor: '#3182CE'}}
                onClick={() => downloadTemplate('json')}>
                ⬇️ Download JSON Template
              </button>
            </div>

            {/* CSV Template */}
            <div style={styles.templateCard}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
              <h4 style={styles.templateTitle}>CSV Format</h4>
              <p style={styles.templateDesc}>
                Best for bulk entry in Excel or Google Sheets.
                Columns: type, body, marks, difficulty, a, b, c, d, correct.
              </p>
              <button style={{...styles.downloadBtn, backgroundColor: '#38A169'}}
                onClick={() => downloadTemplate('csv')}>
                ⬇️ Download CSV Template
              </button>
            </div>
          </div>

          {/* Format Guide */}
          <div style={styles.formatGuide}>
            <h4 style={styles.guideTitle}>📖 Format Guide</h4>
            <div style={styles.guideGrid}>
              <div style={styles.guideItem}>
                <div style={styles.guideLabel}>type</div>
                <div style={styles.guideValue}>mcq, true_false, fill_blank</div>
              </div>
              <div style={styles.guideItem}>
                <div style={styles.guideLabel}>body</div>
                <div style={styles.guideValue}>The question text</div>
              </div>
              <div style={styles.guideItem}>
                <div style={styles.guideLabel}>marks</div>
                <div style={styles.guideValue}>Number (default: 1)</div>
              </div>
              <div style={styles.guideItem}>
                <div style={styles.guideLabel}>difficulty</div>
                <div style={styles.guideValue}>easy, medium, hard</div>
              </div>
              <div style={styles.guideItem}>
                <div style={styles.guideLabel}>a, b, c, d (CSV)</div>
                <div style={styles.guideValue}>MCQ option texts</div>
              </div>
              <div style={styles.guideItem}>
                <div style={styles.guideLabel}>correct (CSV)</div>
                <div style={styles.guideValue}>Letter for MCQ (a/b/c/d), true/false, or answer text</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '24px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
  tab: { padding: '10px 20px', border: '1px solid #DDD', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  alertError: { backgroundColor: '#FFF5F5', color: '#C53030', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #E53E3E', fontSize: '14px' },
  alertSuccess: { backgroundColor: '#F0FFF4', color: '#276749', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #38A169', fontSize: '14px' },
  errorList: { marginTop: '8px', fontSize: '13px' },
  dropZone: { border: '2px dashed #CBD5E0', borderRadius: '12px', padding: '40px', textAlign: 'center', marginBottom: '20px', backgroundColor: '#F7FAFC' },
  dropText: { color: '#333', fontSize: '16px', fontWeight: '600', marginBottom: '4px' },
  dropHint: { color: '#888', fontSize: '13px', marginBottom: '16px' },
  fileInput: { display: 'none' },
  chooseBtn: { display: 'inline-block', backgroundColor: '#1E3A5F', color: 'white', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  fileName: { marginTop: '12px', color: '#3182CE', fontSize: '14px', fontWeight: '600' },
  preview: { marginBottom: '20px' },
  previewTitle: { color: '#1E3A5F', fontSize: '15px', marginBottom: '12px', fontWeight: '700' },
  previewItem: { backgroundColor: '#F7FAFC', borderRadius: '8px', padding: '12px', marginBottom: '8px' },
  previewHeader: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' },
  previewNum: { backgroundColor: '#1E3A5F', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' },
  typeBadge: { color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' },
  marksBadge: { backgroundColor: '#EDF2F7', color: '#4A5568', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' },
  previewBody: { color: '#333', fontSize: '14px', margin: 0 },
  uploadBtn: { width: '100%', backgroundColor: '#38A169', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '700' },
  sectionTitle: { color: '#1E3A5F', fontSize: '18px', marginBottom: '8px' },
  sectionDesc: { color: '#666', fontSize: '14px', marginBottom: '24px' },
  templateGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' },
  templateCard: { backgroundColor: '#F7FAFC', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #E2E8F0' },
  templateTitle: { color: '#1E3A5F', fontSize: '16px', marginBottom: '8px' },
  templateDesc: { color: '#666', fontSize: '13px', marginBottom: '16px', lineHeight: '1.5' },
  downloadBtn: { color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', width: '100%' },
  formatGuide: { backgroundColor: '#F7FAFC', borderRadius: '10px', padding: '16px', border: '1px solid #E2E8F0' },
  guideTitle: { color: '#1E3A5F', fontSize: '15px', marginBottom: '12px' },
  guideGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' },
  guideItem: { backgroundColor: 'white', borderRadius: '6px', padding: '10px', border: '1px solid #EEE' },
  guideLabel: { color: '#1E3A5F', fontWeight: '700', fontSize: '13px', marginBottom: '4px', fontFamily: 'monospace' },
  guideValue: { color: '#555', fontSize: '12px' }
};

export default BulkUpload;