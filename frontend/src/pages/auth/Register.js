import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, classAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function Register() {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', confirm_password: '', class_id: '',
    school_id: '7b1115c7-fd46-40dc-b81d-f47ef03861a7'
  });
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Load classes for selection
    classAPI.getAll().then(res => setClasses(res.data.classes)).catch(() => {});
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm_password) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      await authAPI.register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        role: 'student',
        school_id: form.school_id,
        class_id: form.class_id || null,
        approval_status: 'pending'
      });
      navigate('/login?registered=true');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '480px' }}>
        <div className="login-logo">🎓</div>
        <h1 className="login-title">Student Registration</h1>
        <p className="login-subtitle">Create your student account</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="first_name">First Name</label>
              <input id="first_name" name="first_name" className="form-input"
                placeholder="John" required
                value={form.first_name} onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="last_name">Last Name</label>
              <input id="last_name" name="last_name" className="form-input"
                placeholder="Doe" required
                value={form.last_name} onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input id="email" name="email" type="email" className="form-input"
              placeholder="john@school.com" required
              value={form.email} onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="class_id">Your Class</label>
            <select id="class_id" name="class_id" className="form-input"
              value={form.class_id} onChange={handleChange}
            >
              <option value="">Select your class (optional)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" className="form-input"
                placeholder="Min 6 characters" required
                value={form.password} onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirm_password">Confirm Password</label>
              <input id="confirm_password" name="confirm_password" type="password" className="form-input"
                placeholder="Repeat password" required
                value={form.confirm_password} onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: '8px' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account →'}
          </button>
        </form>

        <p className="text-center text-muted mt-16">
          Already have an account?{' '}
          <span style={{ color: '#3182CE', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => navigate('/login')}>
            Sign in here
          </span>
        </p>
      </div>
    </div>
  );
}

export default Register;