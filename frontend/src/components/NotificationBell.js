import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
const dropdownRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
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
      setNotifications(res.data.notifications);
      setUnread(res.data.unread_count);
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await API.patch('/notifications/read-all');
      setUnread(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {}
  };

  const handleMarkRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await API.delete(`/notifications/${id}`);
      setNotifications(notifications.filter(n => n.id !== id));
      const wasUnread = notifications.find(n => n.id === id && !n.is_read);
      if (wasUnread) setUnread(prev => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const typeColors = {
    success: '#38A169', error: '#E53E3E',
    warning: '#D69E2E', info: '#3182CE'
  };

  const typeIcons = {
    success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️'
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div ref={dropdownRef} style={styles.wrapper}>
      {/* Bell Button */}
      <button style={styles.bellBtn} onClick={() => setOpen(!open)}>
        🔔
        {unread > 0 && (
          <span style={styles.badge}>{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropHeader}>
            <span style={styles.dropTitle}>Notifications</span>
            {unread > 0 && (
              <button style={styles.markAllBtn} onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div style={styles.dropBody}>
            {notifications.length === 0 ? (
              <div style={styles.empty}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  style={{
                    ...styles.notifItem,
                    backgroundColor: n.is_read ? 'white' : '#EBF8FF'
                  }}
                  onClick={() => handleMarkRead(n.id)}
                >
                  <div style={styles.notifIcon}>
                    {typeIcons[n.type] || 'ℹ️'}
                  </div>
                  <div style={styles.notifContent}>
                    <div style={{
                      ...styles.notifTitle,
                      color: typeColors[n.type] || '#3182CE'
                    }}>
                      {n.title}
                    </div>
                    <div style={styles.notifMsg}>{n.message}</div>
                    <div style={styles.notifTime}>{timeAgo(n.created_at)}</div>
                  </div>
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => handleDelete(e, n.id)}
                  >
                    ✕
                  </button>
                  {!n.is_read && <div style={styles.unreadDot} />}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div style={styles.dropFooter}>
              <span style={{ color: '#888', fontSize: '12px' }}>
                {notifications.length} notification(s)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { position: 'relative' },
  bellBtn: {
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    color: 'white', fontSize: '18px', padding: '6px 10px',
    borderRadius: '8px', cursor: 'pointer', position: 'relative'
  },
  badge: {
    position: 'absolute', top: '-6px', right: '-6px',
    backgroundColor: '#E53E3E', color: 'white',
    borderRadius: '10px', fontSize: '10px', fontWeight: '700',
    padding: '1px 5px', minWidth: '16px', textAlign: 'center'
  },
  dropdown: {
    position: 'absolute', right: 0, top: '46px',
    width: '340px', backgroundColor: 'white',
    borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    zIndex: 1000, overflow: 'hidden',
    border: '1px solid #E2E8F0'
  },
  dropHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', borderBottom: '1px solid #EEE',
    backgroundColor: '#F7FAFC'
  },
  dropTitle: { fontWeight: '700', color: '#1E3A5F', fontSize: '15px' },
  markAllBtn: {
    background: 'none', border: 'none', color: '#3182CE',
    cursor: 'pointer', fontSize: '12px', fontWeight: '600'
  },
  dropBody: { maxHeight: '380px', overflowY: 'auto' },
  empty: { padding: '32px', textAlign: 'center', color: '#888', fontSize: '14px' },
  notifItem: {
    display: 'flex', gap: '10px', padding: '12px 16px',
    borderBottom: '1px solid #F7FAFC', cursor: 'pointer',
    position: 'relative', alignItems: 'flex-start',
    transition: 'background 0.15s'
  },
  notifIcon: { fontSize: '20px', flexShrink: 0, marginTop: '2px' },
  notifContent: { flex: 1, minWidth: 0 },
  notifTitle: { fontWeight: '700', fontSize: '13px', marginBottom: '3px' },
  notifMsg: { color: '#555', fontSize: '12px', lineHeight: '1.4', marginBottom: '4px' },
  notifTime: { color: '#AAA', fontSize: '11px' },
  deleteBtn: {
    background: 'none', border: 'none', color: '#CCC',
    cursor: 'pointer', fontSize: '12px', padding: '2px',
    flexShrink: 0, lineHeight: 1
  },
  unreadDot: {
    width: '8px', height: '8px', borderRadius: '50%',
    backgroundColor: '#3182CE', flexShrink: 0, marginTop: '6px'
  },
  dropFooter: {
    padding: '10px 16px', borderTop: '1px solid #EEE',
    backgroundColor: '#F7FAFC', textAlign: 'center'
  }
};

export default NotificationBell;