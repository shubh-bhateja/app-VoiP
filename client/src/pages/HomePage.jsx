import React, { useEffect, useState } from 'react';
import { socket } from '../socket';

export default function HomePage({ me, onStartCall, onLogout }) {
  const [users, setUsers] = useState([]);
  const [callingId, setCallingId] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    socket.on('users-list', (list) => {
      // Exclude yourself
      setUsers(list.filter((u) => u.socketId !== me.socketId));
    });
    socket.on('call-rejected', ({ byUsername }) => {
      setCallingId(null);
      showToast(`${byUsername} rejected your call`);
    });

    return () => {
      socket.off('users-list');
      socket.off('call-rejected');
    };
  }, [me.socketId]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleCall = (user) => {
    setCallingId(user.socketId);
    onStartCall(user);
  };

  const handleCancelCall = (user) => {
    setCallingId(null);
    socket.emit('end-call', { toSocketId: user.socketId });
  };

  return (
    <div style={styles.root}>
      {/* Sidebar header */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.meAvatar}>{me.username.charAt(0).toUpperCase()}</div>
          <div>
            <p style={styles.meName}>{me.username}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span className="dot-online" />
              <span style={styles.onlineLabel}>Online</span>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            id="logout-btn"
            onClick={onLogout}
            style={{ marginLeft: 'auto', padding: '8px 14px', fontSize: '0.8rem' }}
          >
            Sign out
          </button>
        </div>

        <div style={styles.divider} />
        <p style={styles.sectionLabel}>People ({users.length})</p>
      </aside>

      {/* User list */}
      <main style={styles.main}>
        {users.length === 0 ? (
          <div style={styles.empty}>
            <span style={{ fontSize: '3rem' }}>🌐</span>
            <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No one else is online yet.<br />Open another tab to test a call.
            </p>
          </div>
        ) : (
          <div style={styles.list} className="fade-up">
            {users.map((user) => {
              const isCalling = callingId === user.socketId;
              return (
                <div key={user.socketId} className="glass" style={styles.card}>
                  <div style={styles.cardAvatar}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.cardInfo}>
                    <p style={styles.cardName}>{user.username}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="dot-online" />
                      <span style={styles.onlineLabel}>Available</span>
                    </div>
                  </div>
                  <div style={styles.cardActions}>
                    <button
                      className={`btn ${isCalling ? 'btn-danger' : 'btn-primary'} btn-icon`}
                      id={`call-${user.username.toLowerCase()}-btn`}
                      title={isCalling ? 'Cancel call' : `Call ${user.username}`}
                      onClick={() => isCalling ? handleCancelCall(user) : handleCall(user)}
                    >
                      {isCalling ? '📵' : '📞'}
                    </button>
                  </div>
                  {isCalling && (
                    <div style={styles.callingBadge}>Calling…</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Toast notification */}
      {toast && (
        <div style={styles.toast}>{toast}</div>
      )}
    </div>
  );
}

const styles = {
  root: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebar: {
    padding: '24px 28px 0',
    background: 'rgba(17,24,39,0.8)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  sidebarTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 16,
  },
  meAvatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1.1rem',
    flexShrink: 0,
  },
  meName: { fontWeight: 600, fontSize: '0.95rem' },
  onlineLabel: { color: 'var(--success)', fontSize: '0.78rem', fontWeight: 500 },
  divider: { height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 -28px' },
  sectionLabel: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '16px 0 8px',
  },
  main: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 28px',
  },
  empty: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 20px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'border-color 0.2s',
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00d4aa, #059669)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1.2rem',
    flexShrink: 0,
  },
  cardInfo: { flex: 1 },
  cardName: { fontWeight: 600, fontSize: '0.95rem', marginBottom: 2 },
  cardActions: { display: 'flex', gap: 8 },
  callingBadge: {
    position: 'absolute',
    bottom: 6, right: 72,
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  toast: {
    position: 'fixed',
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(30,34,48,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 99,
    padding: '12px 28px',
    fontSize: '0.88rem',
    color: 'var(--text)',
    backdropFilter: 'blur(12px)',
    zIndex: 99,
    animation: 'fadeUp 0.3s ease',
  },
};
