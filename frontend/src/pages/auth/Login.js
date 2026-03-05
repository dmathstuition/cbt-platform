import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function Login() {
  const params = new URLSearchParams(window.location.search);
  const justRegistered = params.get('registered');
  const [form, setForm] = useState({ email: '', password: '', school_id: 'DMATHS001' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      const u = JSON.parse(userData);
      if (u.role === 'student') navigate('/student/dashboard');
      else if (u.role === 'school_admin' || u.role === 'super_admin') navigate('/admin/dashboard');
      else if (u.role === 'parent') navigate('/parent/dashboard');
      else navigate('/teacher/dashboard');
    }
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.login(form);
      login(res.data.user, res.data.token);
      const role = res.data.user.role;
      if (role === 'student') navigate('/student/dashboard');
      else if (role === 'school_admin' || role === 'super_admin') navigate('/admin/dashboard');
      else if (role === 'parent') navigate('/parent/dashboard');
      else navigate('/teacher/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">📝</div>
        <h1 className="login-title">D-MATHS ACADEMY</h1>
        <p className="login-subtitle">Sign in to your account</p>

        {justRegistered && (
          <div className="alert alert-success">
            ✅ Registration successful! Please wait for admin approval before logging in.
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="school_id">School Code</label>
            <input
              id="school_id" name="school_id" type="text"
              className="form-input" placeholder="Enter school code e.g. DMATHS001"
              value={form.school_id} onChange={handleChange} required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email" name="email" type="email"
              className="form-input" placeholder="Enter your email"
              value={form.email} onChange={handleChange} required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password"
              className="form-input" placeholder="Enter your password"
              value={form.password} onChange={handleChange} required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: '8px' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <p className="text-center text-muted mt-16">
          New student?{' '}
          <span style={{ color: '#3182CE', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => navigate('/register')}>
            Register here
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;