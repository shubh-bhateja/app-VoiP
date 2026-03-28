import React, { useRef, useState, useCallback } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { socket } from '../socket';

export default function CallPage({ me, peer, isIncoming, incomingOffer, onCallEnd }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [callState, setCallState] = useState(isIncoming ? 'accepting' : 'calling');
  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const initializedRef = useRef(false);

  const handleCallEnded = useCallback(() => {
    onCallEnd();
  }, [onCallEnd]);

  const { startCall, acceptCall, endCall, toggleMute, toggleCamera } = useWebRTC({
    localVideoRef,
    remoteVideoRef,
    onCallEnded: handleCallEnded,
    onConnectionStateChange: (state) => {
      if (state === 'connected' || state === 'completed') {
        setCallState('active');
      } else if (state === 'disconnected' || state === 'failed') {
        handleEndCall();
      }
    }
  });

  // Initialize call once on mount
  React.useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (isIncoming) {
      acceptCall(peer.socketId, incomingOffer).then(() => {
        setCallState('connecting');
      });
    } else {
      startCall(peer.socketId, me.username).then(() => {
        setCallState('ringing');
      });
      // When the callee accepts, we go connecting
      socket.once('call-accepted', () => setCallState('connecting'));
    }
  }, []); // eslint-disable-line

  // Listen for incoming chat messages
  React.useEffect(() => {
    const handleChatMessage = (msg) => {
      setMessages((prev) => [...prev, { ...msg, isMine: false }]);
      if (!isChatOpen) setIsChatOpen(true); // Auto-open chat on new message
    };
    socket.on('chat-message', handleChatMessage);
    return () => socket.off('chat-message', handleChatMessage);
  }, [isChatOpen]);

  // Auto-scroll chat to bottom
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  const handleMute = () => {
    const nowMuted = toggleMute();
    setMuted(nowMuted);
  };

  const handleCamera = () => {
    const nowOff = toggleCamera();
    setCameraOff(nowOff);
  };

  const handleEndCall = () => {
    socket.emit('end-call', { toSocketId: peer.socketId });
    endCall();
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msgData = {
      toSocketId: peer.socketId,
      message: newMessage.trim(),
      timestamp: Date.now(),
    };
    socket.emit('send-chat-message', msgData);
    setMessages((prev) => [...prev, { ...msgData, isMine: true }]);
    setNewMessage('');
  };

  const stateLabel = {
    calling: 'Connecting…',
    ringing: 'Ringing…',
    accepting: 'Connecting…',
    active: 'Connected',
  }[callState];

  return (
    <div style={styles.root}>
      {/* Remote video — full background */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={styles.remoteVideo}
        id="remote-video"
      />

      {/* Overlay gradient */}
      <div style={styles.overlay} />

      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.peerInfo}>
          <div style={styles.peerAvatar}>{peer.username.charAt(0).toUpperCase()}</div>
          <div>
            <p style={styles.peerName}>{peer.username}</p>
            <p style={{ ...styles.statusLabel, color: callState === 'active' ? 'var(--success)' : 'var(--text-muted)' }}>
              {stateLabel}
            </p>
          </div>
        </div>
        <span style={styles.appTag}>VoiceLink</span>
      </div>

      {/* Local video — PiP */}
      <div style={styles.localWrap}>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{ ...styles.localVideo, opacity: cameraOff ? 0 : 1 }}
          id="local-video"
        />
        {cameraOff && <div style={styles.cameraOffLabel}>📷 Off</div>}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        {/* Mute */}
        <div style={styles.controlGroup}>
          <button
            className={`btn btn-icon ${muted ? 'btn-primary' : 'btn-ghost'}`}
            id="mute-btn"
            onClick={handleMute}
            title={muted ? 'Unmute' : 'Mute'}
            style={{ width: 56, height: 56, fontSize: '1.3rem' }}
          >
            {muted ? '🔇' : '🎤'}
          </button>
          <span style={styles.controlLabel}>{muted ? 'Unmute' : 'Mute'}</span>
        </div>

        {/* End call */}
        <div style={styles.controlGroup}>
          <button
            className="btn btn-danger btn-icon"
            id="end-call-btn"
            onClick={handleEndCall}
            style={{ width: 72, height: 72, fontSize: '1.6rem', boxShadow: '0 4px 28px rgba(255,79,109,0.5)' }}
          >
            📵
          </button>
          <span style={styles.controlLabel}>End</span>
        </div>

        {/* Camera toggle */}
        <div style={styles.controlGroup}>
          <button
            className={`btn btn-icon ${cameraOff ? 'btn-primary' : 'btn-ghost'}`}
            id="camera-btn"
            onClick={handleCamera}
            title={cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            style={{ width: 56, height: 56, fontSize: '1.3rem' }}
          >
            {cameraOff ? '📷' : '🎥'}
          </button>
          <span style={styles.controlLabel}>{cameraOff ? 'Start Cam' : 'Stop Cam'}</span>
        </div>

        {/* Chat toggle */}
        <div style={styles.controlGroup}>
          <button
            className={`btn btn-icon ${isChatOpen ? 'btn-primary' : 'btn-ghost'}`}
            id="chat-btn"
            onClick={() => setIsChatOpen(!isChatOpen)}
            title="Chat"
            style={{ width: 56, height: 56, fontSize: '1.3rem' }}
          >
            💬
          </button>
          <span style={styles.controlLabel}>Chat</span>
        </div>
      </div>

      {/* Chat Sidebar */}
      {isChatOpen && (
        <div style={styles.chatSidebar}>
          <div style={styles.chatHeader}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Chat</h3>
            <button className="btn btn-ghost" onClick={() => setIsChatOpen(false)} style={{ padding: '4px 8px', minWidth: 'auto' }}>✕</button>
          </div>
          
          <div style={styles.chatMessages}>
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 20 }}>No messages yet...</p>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ ...styles.messageWrapper, alignSelf: m.isMine ? 'flex-end' : 'flex-start' }}>
                {!m.isMine && <div style={styles.messageSender}>{m.fromUsername}</div>}
                <div style={{ ...styles.messageBubble, background: m.isMine ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}>
                  {m.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={styles.chatForm}>
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              style={styles.chatInput}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 8 }}>Send</button>
          </form>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    position: 'relative',
    height: '100vh',
    background: '#000',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  remoteVideo: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 0,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.7) 100%)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  topBar: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 28px',
  },
  peerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  peerAvatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1.2rem',
    flexShrink: 0,
  },
  peerName: { fontWeight: 700, fontSize: '1.1rem' },
  statusLabel: { fontSize: '0.8rem', marginTop: 2 },
  appTag: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.8rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
  },
  localWrap: {
    position: 'absolute',
    bottom: 140,
    right: 24,
    width: 140,
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    border: '2px solid rgba(255,255,255,0.2)',
    zIndex: 2,
    background: '#111',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  localVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
    transition: 'opacity 0.3s',
  },
  cameraOffLabel: {
    position: 'absolute',
    fontSize: '1.5rem',
    color: 'var(--text-muted)',
  },
  controls: {
    position: 'absolute',
    bottom: 36,
    left: 0, right: 0,
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  controlLabel: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.6)',
  },
  chatSidebar: {
    position: 'absolute',
    top: 24,
    right: 24,
    bottom: 24,
    width: 340,
    background: 'rgba(20, 20, 25, 0.85)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10,
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
  },
  chatHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  messageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '85%',
  },
  messageSender: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: {
    padding: '10px 14px',
    borderRadius: 16,
    fontSize: '0.95rem',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  chatForm: {
    padding: 16,
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '8px 12px',
    color: 'var(--text)',
    outline: 'none',
  },
};
