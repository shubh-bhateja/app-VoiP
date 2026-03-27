import React, { useState, useEffect, useRef } from 'react';
import { socket } from './socket';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import CallPage from './pages/CallPage';
import IncomingCallModal from './components/IncomingCallModal';

// Screen enum
const SCREEN = {
  LOGIN: 'login',
  HOME: 'home',
  CALL: 'call',
};

export default function App() {
  const [screen, setScreen] = useState(SCREEN.LOGIN);
  const [me, setMe] = useState(null);
  const [callPeer, setCallPeer] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingOffer, setIncomingOffer] = useState(null);

  // Use a ref so socket callbacks always see the latest screen without re-subscribing
  const screenRef = useRef(screen);
  useEffect(() => { screenRef.current = screen; }, [screen]);

  // ── Socket-level call events (register ONCE on mount) ────────────────────
  useEffect(() => {
    const onIncomingCall = ({ fromSocketId, fromUsername, offer }) => {
      // Ignore if not on the home screen
      if (screenRef.current !== SCREEN.HOME) return;
      setIncomingCall({ socketId: fromSocketId, username: fromUsername });
      setIncomingOffer(offer);
    };

    const onForceDisconnect = (reason) => {
      alert(reason);
      socket.disconnect();
      setMe(null);
      setCallPeer(null);
      setIncomingCall(null);
      setScreen(SCREEN.LOGIN);
    };

    socket.on('incoming-call', onIncomingCall);
    socket.on('force-disconnect', onForceDisconnect);

    return () => {
      socket.off('incoming-call', onIncomingCall);
      socket.off('force-disconnect', onForceDisconnect);
    };
  }, []); // ← empty deps: register once, use ref for fresh screen value

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLogin = (user) => {
    setMe(user);
    setScreen(SCREEN.HOME);
  };

  const handleLogout = () => {
    if (callPeer) socket.emit('end-call', { toSocketId: callPeer.socketId });
    socket.disconnect();
    setMe(null);
    setCallPeer(null);
    setIncomingCall(null);
    setIncomingOffer(null);
    setScreen(SCREEN.LOGIN);
  };

  // Outbound call from HomePage
  const handleStartCall = (peer) => {
    setCallPeer(peer);
    setIsIncomingCall(false);
    setIncomingOffer(null);
    setScreen(SCREEN.CALL);
  };

  // Inbound call → Accept
  const handleAcceptCall = () => {
    const offer = incomingOffer;
    const peer = incomingCall;
    setIncomingCall(null);
    setIncomingOffer(null);
    setCallPeer(peer);
    setIsIncomingCall(true);
    setScreen(SCREEN.CALL);
    // Store offer so CallPage can use it
    setIncomingOffer(offer);
  };

  // Inbound call → Reject
  const handleRejectCall = () => {
    socket.emit('reject-call', { toSocketId: incomingCall.socketId });
    setIncomingCall(null);
    setIncomingOffer(null);
  };

  const handleCallEnd = () => {
    setCallPeer(null);
    setIsIncomingCall(false);
    setIncomingOffer(null);
    setScreen(SCREEN.HOME);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%' }}>
      {screen === SCREEN.LOGIN && (
        <LoginPage onLogin={handleLogin} />
      )}

      {screen === SCREEN.HOME && me && (
        <>
          <HomePage
            me={me}
            onStartCall={handleStartCall}
            onLogout={handleLogout}
          />
          {incomingCall && (
            <IncomingCallModal
              from={incomingCall.username}
              onAccept={handleAcceptCall}
              onReject={handleRejectCall}
            />
          )}
        </>
      )}

      {screen === SCREEN.CALL && me && callPeer && (
        <CallPage
          me={me}
          peer={callPeer}
          isIncoming={isIncomingCall}
          incomingOffer={incomingOffer}
          onCallEnd={handleCallEnd}
        />
      )}
    </div>
  );
}
