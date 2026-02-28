import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/admin/users' : `/admin/users?role=${filter}`;
      const res = await API.get(url);
      setUsers(res.data.users);
    } catch (err) {
      console.error('Failed to load users');
    }
    setLoading(false);
  };

  const handleToggle = async (id) => {
    try {
      await API.patch(`/admin/users/${id}/toggle`);
      loadUsers();
    } catch (err) {
      alert('Failed to update user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await API.delete(`/admin/users/${id}`);
      loadUsers();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const handleUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/upload/students', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      setUploadResult(data);
      loadUsers();
    } catch (err) {
      alert('Upload failed');
    }
    setUploading(false);
  };

  const downloadTemplate = (e) => {
    e.preventDefault();
    const csv = 'first_name,last_name,email,password\nJohn,Doe,john@school.com,password123\nJane,Smith,jane@school.com,password123';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_template.csv';
    a.click();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Manage Users</h1>
          <p style={styles.subtitle}>{users.length} users found</p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.uploadBtn} onClick={() => setShowUpload(!showUpload)}>
            📤 Bulk Upload Students
          </button>
          <button style={styles.backBtn} onClick={() => navigate('/admin/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {showUpload && (
        <div style={styles.uploadBox}>
          <h3 style={styles.uploadTitle}>📤 Bulk Upload Students via CSV</h3>
          <p style={styles.uploadHint}>
            CSV must have these columns: <strong>first_name, last_name, email, password</strong>
          </p>
          <a href="#download" onClick={downloadTemplate} style={styles.templateLink}>
            📥 Download CSV Template
          </a>
          <div style={styles.uploadRow}>
            <input
              type="file"
              accept=".csv"
              onChange={e => setCsvFile(e.target.files[0])}
              style={styles.fileInput}
            />
            <button
              style={styles.uploadSubmitBtn}
              onClick={handleUpload}
              disabled={!csvFile || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
          {uploadResult && (
            <div style={{
              ...styles.uploadResult,
              backgroundColor: uploadResult.summary?.failed > 0 ? '#FFFBEB' : '#F0FFF4'
            }}>
              <p>✅ Success: <strong>{uploadResult.summary?.success}</strong> students added</p>
              {uploadResult.summary?.failed > 0 && (
                <p>❌ Failed: <strong>{uploadResult.summary?.failed}</strong> rows skipped</p>
              )}
              {uploadResult.errors?.map((e, i) => (
                <p key={i} style={{ color: '#E53E3E', fontSize: '13px' }}>• {e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={styles.tabs}>
        {['all', 'student', 'teacher', 'school_admin'].map(role => (
          <button
            key={role}
            onClick={() => setFilter(role)}
            style={{
              ...styles.tab,
              backgroundColor: filter === role ? '#1E3A5F' : 'white',
              color: filter === role ? 'white' : '#333'
            }}
          >
            {role === 'all' ? 'All Users' : role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading users...</p>
      ) : users.length === 0 ? (
        <div style={styles.empty}>No users found.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHead}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={styles.tableRow}>
                  <td style={styles.td}>{user.first_name} {user.last_name}</td>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.roleBadge,
                      backgroundColor:
                        user.role === 'school_admin' ? '#1E3A5F' :
                        user.role === 'teacher' ? '#3182CE' :
                        user.role === 'student' ? '#38A169' : '#718096'
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: user.is_active ? '#C6F6D5' : '#FED7D7',
                      color: user.is_active ? '#276749' : '#9B2C2C'
                    }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={{...styles.actionBtn, backgroundColor: user.is_active ? '#D69E2E' : '#38A169'}}
                      onClick={() => handleToggle(user.id)}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      style={{...styles.actionBtn, backgroundColor: '#E53E3E'}}
                      onClick={() => handleDelete(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { color: '#1E3A5F', fontSize: '28px', marginBottom: '4px' },
  subtitle: { color: '#666' },
  headerBtns: { display: 'flex', gap: '10px', alignItems: 'center' },
  uploadBtn: { backgroundColor: '#1E3A5F', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  backBtn: { backgroundColor: 'white', border: '1px solid #DDD', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  uploadBox: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  uploadTitle: { color: '#1E3A5F', marginBottom: '8px' },
  uploadHint: { color: '#666', fontSize: '14px', marginBottom: '8px' },
  templateLink: { color: '#3182CE', fontSize: '14px', display: 'block', marginBottom: '16px' },
  uploadRow: { display: 'flex', gap: '12px', alignItems: 'center' },
  fileInput: { flex: 1, padding: '8px', border: '1px solid #DDD', borderRadius: '6px' },
  uploadSubmitBtn: { backgroundColor: '#38A169', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer' },
  uploadResult: { marginTop: '16px', padding: '16px', borderRadius: '8px', fontSize: '14px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px' },
  tab: { padding: '8px 20px', border: '1px solid #DDD', borderRadius: '20px', cursor: 'pointer', fontSize: '14px' },
  empty: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#666' },
  tableWrapper: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { backgroundColor: '#F7FAFC' },
  th: { padding: '14px 16px', textAlign: 'left', color: '#444', fontWeight: '600', borderBottom: '1px solid #EEE', fontSize: '14px' },
  tableRow: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#333' },
  roleBadge: { color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' },
  statusBadge: { padding: '3px 10px', borderRadius: '12px', fontSize: '12px' },
  actionBtn: { color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', marginRight: '6px' }
};

export default ManageUsers;