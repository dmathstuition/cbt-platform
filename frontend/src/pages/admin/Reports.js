import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

function Reports() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    try {
      const res = await API.get('/admin/reports');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load reports');
    }
    setLoading(false);
  };

  const handleExport = async (type) => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'https://cbt-platform-m6kq.onrender.com/api'}/admin/export?type=${type}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert('Export failed'); }
    setExporting(false);
  };

  if (loading) return <div style={styles.center}><p>Loading reports...</p></div>;
  if (!data) return <div style={styles.center}><p>Failed to load reports.</p></div>;

  const { overview, examPerformance, topStudents, subjectStats, monthlyTrend, classStats } = data;

  const passFailPie = [
    { name: 'Passed', value: overview.passed, color: '#38A169' },
    { name: 'Failed', value: overview.failed, color: '#E53E3E' }
  ];

  const tabs = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'exams', label: '📝 Exams' },
    { key: 'students', label: '👨‍🎓 Students' },
    { key: 'classes', label: '🏫 Classes' },
    { key: 'trends', label: '📈 Trends' }
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📈 Reports & Analytics</h1>
          <p style={styles.subtitle}>Comprehensive school performance data</p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.exportBtn}
            onClick={() => handleExport('results')} disabled={exporting}>
            {exporting ? '⏳' : '⬇️'} Export Results
          </button>
          <button style={styles.exportBtn2}
            onClick={() => handleExport('users')} disabled={exporting}>
            {exporting ? '⏳' : '⬇️'} Export Users
          </button>
          <button style={styles.backBtn} onClick={() => navigate('/admin/dashboard')}>
            ← Dashboard
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        {[
          { icon: '📝', label: 'Total Exams', value: overview.total_exams, color: '#1E3A5F', sub: `${overview.active_exams} active` },
          { icon: '📋', label: 'Submissions', value: overview.total_submissions, color: '#3182CE', sub: `${overview.unique_students} students` },
          { icon: '✅', label: 'Pass Rate', value: `${overview.pass_rate}%`, color: '#38A169', sub: `${overview.passed} passed` },
          { icon: '📊', label: 'Avg Score', value: `${overview.avg_score}%`, color: '#805AD5', sub: 'across all exams' },
          { icon: '👨‍🎓', label: 'Students', value: overview.total_students, color: '#D69E2E', sub: `${overview.active_students} active` },
          { icon: '👨‍🏫', label: 'Teachers', value: overview.total_teachers, color: '#E07B20', sub: `${overview.total_exams} exams created` },
        ].map((k, i) => (
          <div key={i} style={{ ...styles.kpiCard, borderTop: `4px solid ${k.color}` }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{k.icon}</div>
            <div style={{ ...styles.kpiValue, color: k.color }}>{k.value}</div>
            <div style={styles.kpiLabel}>{k.label}</div>
            <div style={styles.kpiSub}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            ...styles.tab,
            backgroundColor: activeTab === t.key ? '#1E3A5F' : 'white',
            color: activeTab === t.key ? 'white' : '#555',
            border: `1px solid ${activeTab === t.key ? '#1E3A5F' : '#DDD'}`
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div style={styles.tabContent}>
          <div style={styles.chartsGrid}>
            {/* Pass/Fail Pie */}
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>🎯 Overall Pass/Fail</h3>
              <p style={styles.chartSub}>{overview.total_submissions} total submissions</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={passFailPie} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {passFailPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} students`, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div style={styles.pieStats}>
                <div style={{ color: '#38A169', fontWeight: '800', fontSize: '18px' }}>
                  {overview.pass_rate}% <span style={{ fontSize: '12px', fontWeight: '400' }}>pass rate</span>
                </div>
              </div>
            </div>

            {/* Exam Performance Bar */}
            <div style={{ ...styles.chartCard, gridColumn: 'span 2' }}>
              <h3 style={styles.chartTitle}>📊 Exam Performance</h3>
              <p style={styles.chartSub}>Passed vs Failed per exam (last 8)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={examPerformance.slice(0, 8)}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Passed" fill="#38A169" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Failed" fill="#E53E3E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* EXAMS TAB */}
      {activeTab === 'exams' && (
        <div style={styles.tabContent}>
          {/* Subject Stats */}
          {subjectStats?.length > 0 && (
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>📚 Performance by Subject</h3>
              <p style={styles.chartSub}>Average score and pass rate per subject</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={subjectStats}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg_score" name="Avg Score %" fill="#3182CE" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pass_rate" name="Pass Rate %" fill="#38A169" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Exam Table */}
          <div style={{ ...styles.chartCard, marginTop: '16px' }}>
            <h3 style={styles.chartTitle}>📋 All Exam Stats</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.th}>Exam</th>
                    <th style={styles.th}>Submissions</th>
                    <th style={styles.th}>Avg Score</th>
                    <th style={styles.th}>Pass Rate</th>
                    <th style={styles.th}>Highest</th>
                    <th style={styles.th}>Lowest</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {examPerformance.map((e, i) => (
                    <tr key={i} style={styles.tr}>
                      <td style={styles.td}><div style={styles.examName}>{e.title}</div></td>
                      <td style={styles.td}>{e.submissions}</td>
                      <td style={styles.td}>
                        <span style={{ color: e.avg_score >= e.pass_mark ? '#38A169' : '#E53E3E', fontWeight: '700' }}>
                          {e.avg_score}%
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.progressWrap}>
                          <div style={{ ...styles.progressFill, width: `${e.pass_rate}%`, backgroundColor: e.pass_rate >= 50 ? '#38A169' : '#E53E3E' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: '#666' }}>{e.pass_rate}%</span>
                      </td>
                      <td style={styles.td}><span style={{ color: '#38A169', fontWeight: '700' }}>{e.highest}%</span></td>
                      <td style={styles.td}><span style={{ color: '#E53E3E', fontWeight: '700' }}>{e.lowest}%</span></td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: { active: '#C6F6D5', completed: '#EDF2F7', draft: '#FEFCBF' }[e.status] || '#EDF2F7',
                          color: { active: '#276749', completed: '#4A5568', draft: '#744210' }[e.status] || '#4A5568'
                        }}>{e.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STUDENTS TAB */}
      {activeTab === 'students' && (
        <div style={styles.tabContent}>
          <div style={styles.chartsGrid}>
            <div style={{ ...styles.chartCard, gridColumn: 'span 3' }}>
              <h3 style={styles.chartTitle}>🏆 Top Performing Students</h3>
              <p style={styles.chartSub}>Ranked by average score across all exams</p>
              <div style={styles.topStudentsList}>
                {topStudents?.length === 0 ? (
                  <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>No data yet</p>
                ) : topStudents?.map((s, i) => (
                  <div key={i} style={styles.studentRow}>
                    <div style={{
                      ...styles.rankBadge,
                      backgroundColor: i === 0 ? '#F6AD55' : i === 1 ? '#CBD5E0' : i === 2 ? '#C05621' : '#EDF2F7',
                      color: i < 3 ? 'white' : '#4A5568'
                    }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </div>
                    <div style={styles.studentAvatar}>
                      {s.name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div style={styles.studentInfo}>
                      <div style={styles.studentName}>{s.name}</div>
                      <div style={styles.studentMeta}>{s.exams_taken} exam(s) taken · Class: {s.class_name || 'N/A'}</div>
                    </div>
                    <div style={styles.studentScores}>
                      <div style={{ ...styles.avgScore, color: s.avg_score >= 70 ? '#38A169' : s.avg_score >= 50 ? '#D69E2E' : '#E53E3E' }}>
                        {s.avg_score}%
                      </div>
                      <div style={styles.scoreLabel}>avg score</div>
                    </div>
                    <div style={styles.scoreBarWrap}>
                      <div style={{ ...styles.scoreBar, width: `${s.avg_score}%`, backgroundColor: s.avg_score >= 70 ? '#38A169' : s.avg_score >= 50 ? '#D69E2E' : '#E53E3E' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLASSES TAB */}
      {activeTab === 'classes' && (
        <div style={styles.tabContent}>
          <div style={styles.chartsGrid}>
            {classStats?.length > 0 && (
              <>
                <div style={{ ...styles.chartCard, gridColumn: 'span 2' }}>
                  <h3 style={styles.chartTitle}>🏫 Class Performance Comparison</h3>
                  <p style={styles.chartSub}>Average score and pass rate by class</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={classStats}
                      margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                      <XAxis dataKey="class_name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avg_score" name="Avg Score %" fill="#3182CE" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pass_rate" name="Pass Rate %" fill="#38A169" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={styles.chartCard}>
                  <h3 style={styles.chartTitle}>📊 Class Summary</h3>
                  <div style={{ marginTop: '12px' }}>
                    {classStats.map((c, i) => (
                      <div key={i} style={styles.classSummaryRow}>
                        <div style={styles.className}>{c.class_name}</div>
                        <div style={styles.classStats2}>
                          <span style={styles.classStat}>{c.students} students</span>
                          <span style={styles.classStat}>{c.submissions} submissions</span>
                          <span style={{ ...styles.classStat, color: '#38A169', fontWeight: '700' }}>{c.pass_rate}% pass</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {(!classStats || classStats.length === 0) && (
              <div style={{ ...styles.chartCard, gridColumn: 'span 3', textAlign: 'center', padding: '60px', color: '#888' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏫</div>
                <p>No class data available yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TRENDS TAB */}
      {activeTab === 'trends' && (
        <div style={styles.tabContent}>
          <div style={styles.chartsGrid}>
            <div style={{ ...styles.chartCard, gridColumn: 'span 3' }}>
              <h3 style={styles.chartTitle}>📈 Monthly Submission Trend</h3>
              <p style={styles.chartSub}>Exam submissions and pass rate over time</p>
              {monthlyTrend?.length > 1 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyTrend}
                    margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="submColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3182CE" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3182CE" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="passColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38A169" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#38A169" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="submissions" name="Submissions"
                      stroke="#3182CE" fill="url(#submColor)" strokeWidth={2} />
                    <Area type="monotone" dataKey="passed" name="Passed"
                      stroke="#38A169" fill="url(#passColor)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📈</div>
                  <p>Not enough data for trend analysis yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '16px', maxWidth: '1300px', margin: '0 auto', paddingBottom: '40px' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { color: '#1E3A5F', fontSize: '26px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  headerBtns: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  exportBtn: { backgroundColor: '#38A169', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  exportBtn2: { backgroundColor: '#3182CE', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px', marginBottom: '24px' },
  kpiCard: { backgroundColor: 'white', borderRadius: '14px', padding: '18px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  kpiValue: { fontSize: '28px', fontWeight: '800', lineHeight: 1 },
  kpiLabel: { color: '#555', fontSize: '13px', fontWeight: '600', margin: '6px 0 2px' },
  kpiSub: { color: '#999', fontSize: '11px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  tab: { padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s' },
  tabContent: { animation: 'fadeIn 0.3s ease' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  chartCard: { backgroundColor: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  chartTitle: { color: '#1E3A5F', fontSize: '15px', fontWeight: '700', marginBottom: '4px' },
  chartSub: { color: '#888', fontSize: '12px', marginBottom: '12px' },
  pieStats: { textAlign: 'center', marginTop: '8px' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '600px' },
  thead: { backgroundColor: '#1E3A5F' },
  th: { padding: '11px 14px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '600' },
  tr: { borderBottom: '1px solid #F0F4F8' },
  td: { padding: '11px 14px', fontSize: '13px', color: '#333', verticalAlign: 'middle' },
  examName: { fontWeight: '600', color: '#1E3A5F', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  progressWrap: { backgroundColor: '#EEE', borderRadius: '99px', height: '6px', width: '80px', overflow: 'hidden', marginBottom: '3px' },
  progressFill: { height: '100%', borderRadius: '99px' },
  statusBadge: { padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  topStudentsList: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' },
  studentRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#F7FAFC', borderRadius: '10px', flexWrap: 'wrap' },
  rankBadge: { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', flexShrink: 0 },
  studentAvatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1E3A5F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', flexShrink: 0 },
  studentInfo: { flex: 1, minWidth: '120px' },
  studentName: { fontWeight: '700', color: '#1E3A5F', fontSize: '14px' },
  studentMeta: { color: '#888', fontSize: '11px', marginTop: '2px' },
  studentScores: { textAlign: 'center', minWidth: '60px' },
  avgScore: { fontSize: '20px', fontWeight: '800', lineHeight: 1 },
  scoreLabel: { color: '#888', fontSize: '10px', marginTop: '2px' },
  scoreBarWrap: { flex: 1, minWidth: '80px', backgroundColor: '#EEE', borderRadius: '99px', height: '6px', overflow: 'hidden' },
  scoreBar: { height: '100%', borderRadius: '99px', transition: 'width 0.6s ease' },
  classSummaryRow: { padding: '10px 0', borderBottom: '1px solid #EEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
  className: { fontWeight: '700', color: '#1E3A5F', fontSize: '14px' },
  classStats2: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  classStat: { color: '#666', fontSize: '12px' },
};

export default Reports;