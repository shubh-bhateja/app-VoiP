import React from 'react';

export default function IncomingCallModal({ from, onAccept, onReject }) {
  return (
    <div style={styles.overlay}>
      <div className="glass fade-up" style={styles.modal}>
        {/* Avatar with pulse ring */}
        <div style={styles.avatarWrap}>
          <div className="pulse" style={styles.avatar}>
            {from.charAt(0).toUpperCase()}
          </div>
        </div>

        <p style={styles.label}>Incoming call from</p>
        <h2 style={styles.name}>{from}</h2>

        <div style={styles.actions}>
          <div style={styles.actionGroup}>
            <button
              className="btn btn-danger btn-icon"
              id="reject-call-btn"
              onClick={onReject}
              title="Reject"
              style={{ width: 64, height: 64, fontSize: '1.5rem' }}
            >
              📵
            </button>
            <span style={styles.hint}>Decline</span>
          </div>

          <div style={styles.actionGroup}>
            <button
              className="btn btn-success btn-icon"
              id="accept-call-btn"
              onClick={onAccept}
              title="Accept"
              style={{ width: 64, height: 64, fontSize: '1.5rem' }}
            >
              📞
            </button>
            <span style={styles.hint}>Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    width: 320,
    padding: '48px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 700,
    color: '#fff',
    position: 'relative',
  },
  label: {
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
  },
  name: {
    fontSize: '1.4rem',
    fontWeight: 700,
  },
  actions: {
    display: 'flex',
    gap: 48,
    marginTop: 16,
  },
  actionGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  hint: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
  },
};
