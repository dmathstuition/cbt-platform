import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from './NotificationBell';

const roleNavItems = {
  school_admin: [
    { icon: '🏠', label: 'Dashboard', path: '/admin/dashboard' },
    { icon: '👥', label: 'Users', path: '/admin/users' },
    { icon: '📋', label: 'Exams', path: '/admin/exams' },
    { icon: '📊', label: 'Results', path: '/admin/results' },
    { icon: '⚙️', label: 'Settings', path: '/admin/school-settings' }
  ],
 super_admin: [
    { icon: '🌐', label: 'Dashboard', path: '/super-admin/dashboard' },
    { icon: '🏫', label: 'Schools', path: '/admin/school-settings' },
    { icon: '🔑', label: 'Password', path: '/change-password' },
  ],
  teacher: [
    { icon: '🏠', label: 'Dashboard', path: '/teacher/dashboard' },
    { icon: '📚', label: 'Questions', path: '/teacher/question-bank' },
    { icon: '➕', label: 'New Exam', path: '/teacher/create-exam' },
    { icon: '🔐', label: 'Password', path: '/change-password' },
  ],
  student: [
    { icon: '🏠', label: 'Dashboard', path: '/student/dashboard' },
    { icon: '📊', label: 'Results', path: '/student/results' },
    { icon: '🏆', label: 'Leaders', path: '/student/leaderboard' },
    { icon: '🔐', label: 'Password', path: '/change-password' }
  ],
  parent: [
    { icon: '🏠', label: 'Dashboard', path: '/parent/dashboard' },
    { icon: '🔐', label: 'Password', path: '/change-password' }
  ]
};

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!user) return null;

  const navItems = roleNavItems[user.role] || roleNavItems.student;

  return (
    <>
      {/* Top Navbar */}
      <nav style={{
        background: `var(--role-nav)`,
        padding: '0 20px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '2px solid var(--role-nav-accent)'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', backdropFilter: 'blur(8px)'
          }}>📝</div>
          <div>
            <div style={{ color: 'white', fontWeight: '800', fontSize: '16px', lineHeight: 1 }}>
              CBT Platform
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginTop: '2px' }}>
              D-MATHS ACADEMY
            </div>
          </div>
        </div>

        {/* Desktop Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Desktop nav links */}
          <div style={{ display: 'flex', gap: '4px' }} className="desktop-only">
            {navItems.map((item, i) => (
              <button key={i}
                onClick={() => navigate(item.path)}
                style={{
                  background: location.pathname === item.path
                    ? 'rgba(255,255,255,0.2)' : 'transparent',
                  border: 'none', color: 'white', padding: '6px 12px',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                  fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'all 0.2s'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }} className="desktop-only" />

          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }} className="desktop-only">
            {user.first_name}
          </span>

          <NotificationBell />

          <button onClick={() => setDarkMode(!darkMode)} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', width: '36px', height: '36px', borderRadius: '10px',
            cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {darkMode ? '☀️' : '🌙'}
          </button>

          <button onClick={handleLogout} style={{
            background: 'rgba(229,62,62,0.2)', color: '#FC8181',
            border: '1px solid rgba(229,62,62,0.3)',
            padding: '6px 14px', borderRadius: '8px',
            cursor: 'pointer', fontSize: '13px', fontWeight: '600'
          }} className="desktop-only">
            Logout
          </button>

          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', width: '36px', height: '36px', borderRadius: '10px',
            cursor: 'pointer', fontSize: '18px', display: 'none',
            alignItems: 'center', justifyContent: 'center'
          }} className="mobile-menu-btn">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: '64px', left: 0, right: 0, zIndex: 99,
          background: 'rgba(20,30,50,0.97)',
          backdropFilter: 'blur(20px)',
          padding: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideDown 0.2s ease'
        }}>
          {/* User info */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px', background: 'rgba(255,255,255,0.08)',
            borderRadius: '12px', marginBottom: '16px'
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'var(--role-nav-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '800', fontSize: '16px', color: 'white'
            }}>
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: '700' }}>{user.first_name} {user.last_name}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{user.role}</div>
            </div>
          </div>

          {/* Nav items */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '16px' }}>
            {navItems.map((item, i) => (
              <button key={i} onClick={() => { navigate(item.path); setMenuOpen(false); }} style={{
                background: location.pathname === item.path
                  ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', padding: '12px 8px', borderRadius: '12px',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600'
              }}>
                <span style={{ fontSize: '22px' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Bottom actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setDarkMode(!darkMode)} style={{
              flex: 1, background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white', padding: '12px', borderRadius: '10px',
              cursor: 'pointer', fontSize: '14px'
            }}>
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button onClick={() => { navigate('/change-password'); setMenuOpen(false); }} style={{
              flex: 1, background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white', padding: '12px', borderRadius: '10px',
              cursor: 'pointer', fontSize: '14px'
            }}>
              🔐 Password
            </button>
            <button onClick={handleLogout} style={{
              flex: 1, background: 'rgba(229,62,62,0.2)',
              border: '1px solid rgba(229,62,62,0.3)',
              color: '#FC8181', padding: '12px', borderRadius: '10px',
              cursor: 'pointer', fontSize: '14px', fontWeight: '700'
            }}>
              🚪 Logout
            </button>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar (Mobile only) */}
      <div className="bottom-tab-bar">
        <div className="bottom-tab-bar-inner">
          {navItems.map((item, i) => (
            <button key={i} className={`bottom-tab-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}>
              <div className="bottom-tab-icon">{item.icon}</div>
              <span className="bottom-tab-label">{item.label}</span>
            </button>
          ))}
          <button className="bottom-tab-item" onClick={handleLogout}>
            <div className="bottom-tab-icon">🚪</div>
            <span className="bottom-tab-label">Logout</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none !important; }
          .desktop-only { display: flex !important; }
        }
      `}</style>
    </>
  );
}

export default Navbar;
