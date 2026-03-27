import React, { useState } from 'react';
import { socket } from '../socket';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) { setError('Please enter a username'); return; }
    if (name.length < 2) { setError('Username must be at least 2 characters'); return; }

    setLoading(true);
    setError('');

    socket.connect();

    // Timeout if the server is unreachable
    const timeout = setTimeout(() => {
      socket.disconnect();
      setLoading(false);
      setError('Cannot connect to server. Is the signaling server running on port 3001?');
    }, 5000);

    socket.once('connect_error', () => {
      clearTimeout(timeout);
      socket.disconnect();
      setLoading(false);
      setError('Cannot reach the signaling server. Start it with: cd server && node index.js');
    });

    socket.emit('register', name);
    socket.once('registered', ({ socketId }) => {
      clearTimeout(timeout);
      setLoading(false);
      onLogin({ username: name, socketId });
    });
  };

  return (
    <div style={styles.root}>
      {/* Animated background orbs */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <div className="glass fade-up" style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logo}>
            <span style={{ fontSize: '2rem' }}>📞</span>
          </div>
          <h1 style={styles.appName}>VoiceLink</h1>
          <p style={styles.tagline}>Crystal-clear calls, directly in your browser</p>
        </div>

        <form onSubmit={handleJoin} style={styles.form}>
          <label style={styles.label}>Your display name</label>
          <input
            className="field"
            id="username-input"
            type="text"
            placeholder="e.g. Alice"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            autoFocus
            maxLength={24}
          />
          {error && <p style={styles.error}>{error}</p>}

          <button
            className="btn btn-primary"
            id="join-btn"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px', padding: '16px' }}
          >
            {loading ? 'Connecting…' : 'Join →'}
          </button>
        </form>

        <p style={styles.note}>
          No account needed · Works in any modern browser
        </p>
      </div>
    </div>
  );
}

const styles = {
  root: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  orb1: {
    position: 'absolute',
    width: 480,
    height: 480,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(108,99,255,0.22) 0%, transparent 70%)',
    top: '-120px',
    left: '-120px',
    filter: 'blur(40px)',
    pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,212,170,0.18) 0%, transparent 70%)',
    bottom: '-100px',
    right: '-100px',
    filter: 'blur(40px)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: '48px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    zIndex: 1,
  },
  logoWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 40px rgba(108,99,255,0.5)',
  },
  appName: {
    fontSize: '1.8rem',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #e8eaf0, #6c63ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  tagline: {
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'var(--text-muted)',
  },
  error: {
    color: 'var(--danger)',
    fontSize: '0.82rem',
  },
  note: {
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    textAlign: 'center',
  },
};
