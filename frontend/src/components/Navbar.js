import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!user) return null;

  const roleColors = {
    student: '#38A169', teacher: '#3182CE',
    school_admin: '#805AD5', super_admin: '#E53E3E', parent: '#D69E2E'
  };

  return (
    <div style={{ position: 'relative', zIndex: 100 }}>
      <nav style={styles.nav}>
        <div style={styles.brand}>📝 CBT Platform</div>

        {/* Desktop */}
        <div style={styles.desktopRight} className="desktop-hide">
          <span style={styles.welcome}>Welcome, {user.first_name}</span>
          <span style={{
            ...styles.roleBadge,
            backgroundColor: roleColors[user.role] || '#718096'
          }}>
            {user.role}
          </span>
          <NotificationBell />
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>

        {/* Hamburger */}
        <button
          style={{...styles.hamburger, display: 'block'}}
          className="mobile-show"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={styles.mobileMenu}>
          <div style={styles.mobileUser}>
            <div style={styles.mobileAvatar}>
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div>
              <div style={styles.mobileName}>{user.first_name} {user.last_name}</div>
              <span style={{
                ...styles.roleBadge,
                backgroundColor: roleColors[user.role] || '#718096',
                marginTop: '4px', display: 'inline-block'
              }}>
                {user.role}
              </span>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <NotificationBell />
          </div>
          <button
            style={styles.mobileLogout}
            onClick={() => { handleLogout(); setMenuOpen(false); }}
          >
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  nav: {
    backgroundColor: '#1E3A5F', padding: '0 20px', height: '60px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  },
  brand: { fontSize: '18px', fontWeight: '700', color: 'white' },
  desktopRight: {
    display: 'flex', alignItems: 'center', gap: '14px'
  },
  welcome: { fontSize: '13px', color: '#A0AEC0' },
  roleBadge: {
    color: 'white', padding: '3px 10px', borderRadius: '12px',
    fontSize: '11px', fontWeight: '700'
  },
  logoutBtn: {
    background: 'rgba(229,62,62,0.15)', color: '#FC8181',
    border: '1px solid rgba(229,62,62,0.3)',
    padding: '6px 14px', borderRadius: '6px',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600'
  },
  hamburger: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'white', fontSize: '18px',
    padding: '6px 10px', borderRadius: '6px',
    cursor: 'pointer'
  },
  mobileMenu: {
    backgroundColor: '#162d4a', padding: '16px 20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  },
  mobileUser: {
    display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px'
  },
  mobileAvatar: {
    width: '40px', height: '40px', borderRadius: '50%',
    backgroundColor: '#3182CE', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '14px', flexShrink: 0
  },
  mobileName: { color: 'white', fontWeight: '600', fontSize: '15px' },
  mobileLogout: {
    width: '100%', backgroundColor: '#E53E3E', color: 'white',
    border: 'none', padding: '12px', borderRadius: '8px',
    cursor: 'pointer', fontSize: '15px', fontWeight: '700'
  }
};

export default Navbar;