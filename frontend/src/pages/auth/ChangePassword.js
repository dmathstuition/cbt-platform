import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

function ChangePassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getDashboard = () => {
    if (user?.role === 'student') return '/student/dashboard';
    if (user?.role === 'teacher') return '/teacher/dashboard';
    if (user?.role === 'parent') return '/parent/dashboard';
    return '/admin/dashboard';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.new_password !== form.confirm_password) {
      return setError('New passwords do not match');
    }
    if (form.new_password.length < 6) {
      return setError('New password must be at least 6 characters');
    }

    setLoading(true);
    try {
      await API.post('/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password
      });
      setSuccess('✅ Password changed successfully!');
      setForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => navigate(getDashboard()), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.icon}>🔐</div>
        <h1 style={styles.title}>Change Password</h1>
        <p style={styles.subtitle}>Update your account password</p>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Current Password</label>
            <input style={styles.input} type="password" required
              placeholder="Enter current password"
              value={form.current_password}
              onChange={e => setForm({ ...form, current_password: e.target.value })}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>New Password</label>
            <input style={styles.input} type="password" required
              placeholder="Min 6 characters"
              value={form.new_password}
              onChange={e => setForm({ ...form, new_password: e.target.value })}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirm New Password</label>
            <input style={styles.input} type="password" required
              placeholder="Repeat new password"
              value={form.confirm_password}
              onChange={e => setForm({ ...form, confirm_password: e.target.value })}
            />
          </div>

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? '⏳ Updating...' : '🔐 Change Password'}
          </button>
        </form>

        <button style={styles.backBtn} onClick={() => navigate(getDashboard())}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  card: { backgroundColor: 'white', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
  icon: { fontSize: '40px', textAlign: 'center', marginBottom: '12px' },
  title: { color: '#1E3A5F', fontSize: '22px', fontWeight: '700', textAlign: 'center', marginBottom: '4px' },
  subtitle: { color: '#666', fontSize: '14px', textAlign: 'center', marginBottom: '24px' },
  error: { backgroundColor: '#FFF5F5', color: '#C53030', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #E53E3E', fontSize: '14px' },
  successBox: { backgroundColor: '#F0FFF4', color: '#276749', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid #38A169', fontSize: '14px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', marginBottom: '6px', color: '#333', fontWeight: '600', fontSize: '14px' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '14px', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '14px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '700', marginTop: '8px' },
  backBtn: { width: '100%', padding: '12px', backgroundColor: 'transparent', color: '#666', border: '1px solid #DDD', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', marginTop: '12px' }
};

export default ChangePassword;