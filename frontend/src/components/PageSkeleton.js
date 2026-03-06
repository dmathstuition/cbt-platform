import React from 'react';

function PageSkeleton() {
  return (
    <div style={styles.container}>
      {/* Header skeleton */}
      <div style={styles.header}>
        <div style={{ ...styles.skel, width: '200px', height: '28px' }} />
        <div style={{ ...styles.skel, width: '120px', height: '36px', borderRadius: '8px' }} />
      </div>

      {/* Stats row skeleton */}
      <div style={styles.statsRow}>
        {[1,2,3,4].map(i => (
          <div key={i} style={styles.statCard}>
            <div style={{ ...styles.skel, width: '48px', height: '36px', margin: '0 auto 8px' }} />
            <div style={{ ...styles.skel, width: '60px', height: '14px', margin: '0 auto' }} />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div style={styles.contentRow}>
        <div style={styles.mainBlock}>
          {[1,2,3].map(i => (
            <div key={i} style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ ...styles.skel, width: '60%', height: '18px' }} />
                <div style={{ ...styles.skel, width: '60px', height: '22px', borderRadius: '20px' }} />
              </div>
              <div style={{ ...styles.skel, width: '100%', height: '12px', marginBottom: '8px' }} />
              <div style={{ ...styles.skel, width: '80%', height: '12px', marginBottom: '8px' }} />
              <div style={{ ...styles.skel, width: '40%', height: '12px' }} />
            </div>
          ))}
        </div>
        <div style={styles.sideBlock}>
          <div style={{ ...styles.card, height: '200px' }}>
            <div style={{ ...styles.skel, width: '100%', height: '100%', borderRadius: '8px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

const shimmer = `
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position: 600px 0; }
  }
`;

const skelBase = {
  background: 'linear-gradient(90deg, var(--border, #E2E8F0) 25%, var(--border-light, #EDF2F7) 50%, var(--border, #E2E8F0) 75%)',
  backgroundSize: '600px 100%',
  animation: 'shimmer 1.4s infinite linear',
  borderRadius: '6px',
};

const styles = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '14px', marginBottom: '24px' },
  statCard: { backgroundColor: 'var(--card-bg, white)', borderRadius: '14px', padding: '20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  contentRow: { display: 'flex', gap: '24px' },
  mainBlock: { flex: 2, display: 'flex', flexDirection: 'column', gap: '14px' },
  sideBlock: { flex: 1, minWidth: '240px' },
  card: { backgroundColor: 'var(--card-bg, white)', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  skel: { ...skelBase },
};

// Inject shimmer keyframes
const styleTag = document.createElement('style');
styleTag.textContent = shimmer;
document.head.appendChild(styleTag);

export default PageSkeleton;