import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const dropdownRef = useRef(null);
  const prevUnread = useRef(0);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 20000); // poll every 20s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      const newUnread = res.data.unread_count;
      // Pulse animation if new notifications arrived
      if (newUnread > prevUnread.current) setHasNew(true);
      prevUnread.current = newUnread;
      setNotifications(res.data.notifications);
      setUnread(newUnread);
    } catch (err) {}
  };

  const handleOpen = () => {
    setOpen(!open);
    setHasNew(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await API.patch('/notifications/read-all');
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {}
  };

  const handleMarkRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      const wasUnread = notifications.find(n => n.id === id && !n.is_read);
      await API.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) setUnread(prev => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const typeConfig = {
    success: { icon: '🎉', color: '#38A169', bg: '#F0FFF4', border: '#68D391' },
    error:   { icon: '❌', color: '#E53E3E', bg: '#FFF5F5', border: '#FC8181' },
    warning: { icon: '⚠️', color: '#C9860A', bg: '#FFFBEB', border: '#FAD080' },
    info:    { icon: 'ℹ️', color: '#3182CE', bg: '#EBF8FF', border: '#90CDF4' },
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const unreadNotifs = notifications.filter(n => !n.is_read);
  const readNotifs = notifications.filter(n => n.is_read);

  return (
    <>
      <style>{`
        @keyframes bellRing {
          0%,100% { transform: rotate(0deg); }
          15% { transform: rotate(15deg); }
          30% { transform: rotate(-15deg); }
          45% { transform: rotate(10deg); }
          60% { transform: rotate(-10deg); }
          75% { transform: rotate(5deg); }
        }
        @keyframes badgePop {
          0% { transform: scale(0); }
          70% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .notif-item:hover { background-color: var(--card-bg-2, #F8FAFC) !important; }
        .notif-delete:hover { color: #E53E3E !important; }
      `}</style>

      <div ref={dropdownRef} style={{ position: 'relative' }}>
        {/* Bell Button */}
        <button onClick={handleOpen} style={{
          background: open ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'white', fontSize: '18px',
          width: '38px', height: '38px', borderRadius: '10px',
          cursor: 'pointer', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: hasNew ? 'bellRing 0.6s ease' : 'none',
          transition: 'background 0.2s'
        }}>
          🔔
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: '-5px', right: '-5px',
              backgroundColor: '#E53E3E', color: 'white',
              borderRadius: '10px', fontSize: '10px', fontWeight: '800',
              padding: '1px 5px', minWidth: '17px', textAlign: 'center',
              border: '2px solid var(--role-nav, #1A2F5E)',
              animation: 'badgePop 0.3s ease'
            }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'absolute', right: 0, top: '46px',
            width: '360px',
            background: 'var(--card-bg, white)',
            borderRadius: '16px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            zIndex: 1000, overflow: 'hidden',
            border: '1px solid var(--border, #E2E8F0)',
            animation: 'slideDown 0.2s ease'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border, #EEE)',
              background: 'var(--role-primary, #1A2F5E)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'white', fontWeight: '800', fontSize: '15px' }}>
                  🔔 Notifications
                </span>
                {unread > 0 && (
                  <span style={{
                    backgroundColor: '#E53E3E', color: 'white',
                    padding: '2px 8px', borderRadius: '20px',
                    fontSize: '11px', fontWeight: '700'
                  }}>{unread} new</span>
                )}
              </div>
              {unread > 0 && (
                <button onClick={handleMarkAllRead} style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none',
                  color: 'white', cursor: 'pointer',
                  fontSize: '11px', fontWeight: '700',
                  padding: '4px 10px', borderRadius: '6px'
                }}>
                  ✓ Mark all read
                </button>
              )}
            </div>

            {/* Body */}
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔔</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    No notifications yet
                  </p>
                  <p style={{ color: 'var(--text-light)', fontSize: '12px', marginTop: '4px' }}>
                    Exam alerts and results will appear here
                  </p>
                </div>
              ) : (
                <>
                  {/* Unread section */}
                  {unreadNotifs.length > 0 && (
                    <>
                      <div style={styles.sectionLabel}>New</div>
                      {unreadNotifs.map(n => (
                        <NotifItem key={n.id} n={n} typeConfig={typeConfig}
                          timeAgo={timeAgo} onRead={handleMarkRead} onDelete={handleDelete} />
                      ))}
                    </>
                  )}
                  {/* Read section */}
                  {readNotifs.length > 0 && (
                    <>
                      {unreadNotifs.length > 0 && (
                        <div style={styles.sectionLabel}>Earlier</div>
                      )}
                      {readNotifs.slice(0, 15).map(n => (
                        <NotifItem key={n.id} n={n} typeConfig={typeConfig}
                          timeAgo={timeAgo} onRead={handleMarkRead} onDelete={handleDelete} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div style={{
                padding: '10px 16px', borderTop: '1px solid var(--border, #EEE)',
                background: 'var(--card-bg-2, #F7FAFC)',
                textAlign: 'center',
                color: 'var(--text-muted)', fontSize: '12px'
              }}>
                {notifications.length} total notification(s)
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function NotifItem({ n, typeConfig, timeAgo, onRead, onDelete }) {
  const cfg = typeConfig[n.type] || typeConfig.info;
  return (
    <div className="notif-item" onClick={() => onRead(n.id)} style={{
      display: 'flex', gap: '10px', padding: '12px 16px',
      borderBottom: '1px solid var(--border-light, #F7FAFC)',
      cursor: 'pointer', alignItems: 'flex-start',
      backgroundColor: n.is_read ? 'var(--card-bg, white)' : cfg.bg,
      borderLeft: n.is_read ? 'none' : `3px solid ${cfg.border}`,
      transition: 'background 0.15s'
    }}>
      <div style={{
        width: '34px', height: '34px', borderRadius: '10px',
        backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '16px', flexShrink: 0
      }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: n.is_read ? '600' : '800',
          fontSize: '13px', color: cfg.color, marginBottom: '3px'
        }}>
          {n.title}
        </div>
        <div style={{
          color: 'var(--text-muted)', fontSize: '12px',
          lineHeight: '1.5', marginBottom: '5px'
        }}>
          {n.message}
        </div>
        <div style={{ color: 'var(--text-light)', fontSize: '11px' }}>
          {timeAgo(n.created_at)}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <button className="notif-delete" onClick={(e) => onDelete(e, n.id)} style={{
          background: 'none', border: 'none', color: 'var(--text-light)',
          cursor: 'pointer', fontSize: '12px', padding: '2px 4px', lineHeight: 1
        }}>✕</button>
        {!n.is_read && (
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: cfg.color
          }} />
        )}
      </div>
    </div>
  );
}

const styles = {
  sectionLabel: {
    padding: '6px 16px', fontSize: '11px', fontWeight: '800',
    color: 'var(--text-light)', textTransform: 'uppercase',
    letterSpacing: '0.5px', background: 'var(--card-bg-2, #F7FAFC)',
    borderBottom: '1px solid var(--border-light, #EEE)'
  }
};

export default NotificationBell;