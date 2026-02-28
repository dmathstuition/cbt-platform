import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const actionIcons = {
  login: '🔐', exam_started: '▶️', exam_submitted: '✅',
  exam_created: '📝', user_approved: '✅', user_rejected: '❌', default: '📌'
};

const actionColors = {
  login: '#3182CE', exam_started: '#D69E2E', exam_submitted: '#38A169',
  exam_created: '#805AD5', user_approved: '#38A169', user_rejected: '#E53E3E', default: '#718096'
};

function ActivityFeed({ isAdmin = false }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  const PREVIEW_COUNT = 4;

  useEffect(() => { loadActivities(); }, []);

  const loadActivities = async () => {
    try {
      const endpoint = isAdmin ? '/activity/school' : '/activity/my';
      const res = await API.get(`${endpoint}?limit=50`);
      setActivities(res.data.activities);
    } catch (err) {
      console.error('Failed to load activities');
    }
    setLoading(false);
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const displayed = showAll ? activities : activities.slice(0, PREVIEW_COUNT);

  if (loading) return (
    <div style={styles.container}>
      <h3 style={styles.title}>🕐 Recent Activity</h3>
      <div style={styles.loading}>Loading...</div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🕐 Recent Activity</h3>
        {isAdmin && (
          <span style={styles.adminBadge}>All Users</span>
        )}
      </div>

      {activities.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📭</div>
          <p>No recent activity yet</p>
        </div>
      ) : (
        <>
          <div style={styles.feed}>
            {displayed.map((a, i) => (
              <div key={a.id} style={{
                ...styles.item,
                borderBottom: i < displayed.length - 1 ? '1px solid #F0F4F8' : 'none'
              }}>
                <div style={{
                  ...styles.iconBox,
                  backgroundColor: `${actionColors[a.action] || actionColors.default}18`,
                  color: actionColors[a.action] || actionColors.default
                }}>
                  {actionIcons[a.action] || actionIcons.default}
                </div>
                <div style={styles.content}>
                  {isAdmin && a.user_name && (
                    <div style={styles.userName}>
                      {a.user_name}
                      <span style={{
                        ...styles.rolePill,
                        backgroundColor: a.role === 'student' ? '#C6F6D5' :
                          a.role === 'teacher' ? '#BEE3F8' :
                          a.role === 'parent' ? '#FEFCBF' : '#E9D8FD',
                        color: a.role === 'student' ? '#276749' :
                          a.role === 'teacher' ? '#2A4365' :
                          a.role === 'parent' ? '#744210' : '#553C9A'
                      }}>
                        {a.role}
                      </span>
                    </div>
                  )}
                  <div style={styles.description}>{a.description}</div>
                  <div style={styles.time}>{timeAgo(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* See More / See Less */}
          {activities.length > PREVIEW_COUNT && (
            <button
              style={styles.seeMoreBtn}
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? '▲ Show Less'
                : `▼ See More (${activities.length - PREVIEW_COUNT} more activities)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { color: '#1E3A5F', fontSize: '16px', fontWeight: '700', margin: 0 },
  adminBadge: { backgroundColor: '#EDF2F7', color: '#4A5568', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' },
  loading: { textAlign: 'center', color: '#888', padding: '16px', fontSize: '14px' },
  empty: { textAlign: 'center', padding: '20px', color: '#888', fontSize: '14px' },
  feed: { display: 'flex', flexDirection: 'column' },
  item: { display: 'flex', gap: '12px', padding: '10px 0', alignItems: 'flex-start' },
  iconBox: { width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 },
  content: { flex: 1 },
  userName: { fontWeight: '700', color: '#1E3A5F', fontSize: '13px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  rolePill: { padding: '1px 7px', borderRadius: '8px', fontSize: '10px', fontWeight: '700' },
  description: { color: '#555', fontSize: '13px', lineHeight: '1.4', marginBottom: '2px' },
  time: { color: '#AAA', fontSize: '11px' },
  seeMoreBtn: {
    width: '100%', marginTop: '12px', padding: '10px',
    backgroundColor: '#F7FAFC', border: '1px solid #E2E8F0',
    borderRadius: '8px', cursor: 'pointer', color: '#3182CE',
    fontSize: '13px', fontWeight: '600', textAlign: 'center'
  }
};

export default ActivityFeed;