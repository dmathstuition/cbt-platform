import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

const roleThemes = {
  school_admin: {
    '--role-primary': '#1A2F5E',
    '--role-secondary': '#C9860A',
    '--role-accent': '#F6AD55',
    '--role-gradient': 'linear-gradient(135deg, #1A2F5E 0%, #2B4A8F 50%, #C9860A 100%)',
    '--role-nav': '#1A2F5E',
    '--role-nav-accent': '#C9860A',
    '--role-light': '#FFF8EE',
    '--role-card-border': '#C9860A',
  },
  teacher: {
    '--role-primary': '#1A4731',
    '--role-secondary': '#38A169',
    '--role-accent': '#68D391',
    '--role-gradient': 'linear-gradient(135deg, #1A4731 0%, #276749 50%, #38A169 100%)',
    '--role-nav': '#1A4731',
    '--role-nav-accent': '#38A169',
    '--role-light': '#F0FFF4',
    '--role-card-border': '#38A169',
  },
  student: {
    '--role-primary': '#1A3A6E',
    '--role-secondary': '#E07B20',
    '--role-accent': '#F6AD55',
    '--role-gradient': 'linear-gradient(135deg, #1A3A6E 0%, #2B5BA8 50%, #E07B20 100%)',
    '--role-nav': '#1A3A6E',
    '--role-nav-accent': '#E07B20',
    '--role-light': '#EBF4FF',
    '--role-card-border': '#E07B20',
  },
  parent: {
    '--role-primary': '#44267A',
    '--role-secondary': '#2C8A8A',
    '--role-accent': '#4FD1C5',
    '--role-gradient': 'linear-gradient(135deg, #44267A 0%, #5A3698 50%, #2C8A8A 100%)',
    '--role-nav': '#44267A',
    '--role-nav-accent': '#2C8A8A',
    '--role-light': '#FAF5FF',
    '--role-card-border': '#2C8A8A',
  },
  super_admin: {
    '--role-primary': '#1A2F5E',
    '--role-secondary': '#C9860A',
    '--role-accent': '#F6AD55',
    '--role-gradient': 'linear-gradient(135deg, #1A2F5E 0%, #2B4A8F 50%, #C9860A 100%)',
    '--role-nav': '#1A2F5E',
    '--role-nav-accent': '#C9860A',
    '--role-light': '#FFF8EE',
    '--role-card-border': '#C9860A',
  }
};

export function applyTheme(role) {
  const theme = roleThemes[role] || roleThemes.student;
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => root.style.setProperty(key, value));
}

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setToken(savedToken);
      setUser(parsedUser);
      applyTheme(parsedUser.role);
    }
    // Apply saved dark mode
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    setLoading(false);
  }, []);

  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    applyTheme(userData.role);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.documentElement.removeAttribute('data-theme');
    // Reset role theme
    const root = document.documentElement;
    ['--role-primary','--role-secondary','--role-accent','--role-gradient',
     '--role-nav','--role-nav-accent','--role-light','--role-card-border'
    ].forEach(k => root.style.removeProperty(k));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}