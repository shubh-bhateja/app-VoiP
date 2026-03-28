import { useRef, useEffect, useCallback } from 'react';
import { socket } from '../socket';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Global buffer for early ICE candidates that arrive before the CallPage mounts
const globalIceBuffer = [];
socket.on('ice-candidate', ({ candidate }) => {
  globalIceBuffer.push(candidate);
});

export function useWebRTC({ localVideoRef, remoteVideoRef, onCallEnded, onConnectionStateChange }) {
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getMedia = useCallback(async (video = true, audio = true) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  }, [localVideoRef]);

  const createPC = useCallback((remoteSocketId) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('ice-candidate', {
          toSocketId: remoteSocketId,
          candidate: e.candidate,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (onConnectionStateChange) onConnectionStateChange(pc.iceConnectionState);
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        if (e.streams && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0];
        } else {
          let inboundStream = remoteVideoRef.current.srcObject;
          if (!inboundStream) {
            inboundStream = new MediaStream();
            remoteVideoRef.current.srcObject = inboundStream;
          }
          inboundStream.addTrack(e.track);
        }
      }
    };

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    return pc;
  }, [remoteVideoRef]);

  const addPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    
    // Process local pending ones
    const allCandidates = [...pendingCandidatesRef.current, ...globalIceBuffer];
    pendingCandidatesRef.current = [];
    globalIceBuffer.length = 0; // Clear global buffer once processed

    for (const c of allCandidates) {
      if (!c) continue;
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
  }, []);

  // ── Call initiation (caller side) ────────────────────────────────────────

  const startCall = useCallback(async (toSocketId, fromUsername) => {
    await getMedia();
    const pc = createPC(toSocketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('call-user', { toSocketId, offer, fromUsername });
  }, [getMedia, createPC]);

  // ── Call acceptance (callee side) ────────────────────────────────────────

  const acceptCall = useCallback(async (fromSocketId, incomingOffer) => {
    await getMedia();
    const pc = createPC(fromSocketId);
    await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
    await addPendingCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('accept-call', { toSocketId: fromSocketId, answer });
  }, [getMedia, createPC, addPendingCandidates]);

  // ── Handle call accepted (caller receives answer) ─────────────────────────

  const handleCallAccepted = useCallback(async (answer) => {
    const pc = pcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    await addPendingCandidates();
  }, [addPendingCandidates]);

  // ── Handle ICE candidate ──────────────────────────────────────────────────

  const handleIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }
    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
  }, []);

  // ── Cleanup / end call ────────────────────────────────────────────────────

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, [localVideoRef, remoteVideoRef]);

  const closePC = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingCandidatesRef.current = [];
  }, []);

  const endCall = useCallback(() => {
    stopLocalStream();
    closePC();
    if (onCallEnded) onCallEnded();
  }, [stopLocalStream, closePC, onCallEnded]);

  // ── Media toggles ─────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return false;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return !track.enabled; // returns true if now muted
  }, []);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return false;
    const track = localStreamRef.current.getVideoTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return !track.enabled; // returns true if camera off
  }, []);

  // ── Socket event listeners ────────────────────────────────────────────────

  useEffect(() => {
    const listenerAccept = ({ answer }) => handleCallAccepted(answer);
    const listenerIce = ({ candidate }) => handleIceCandidate(candidate);
    const listenerEnd = () => endCall();

    socket.on('call-accepted', listenerAccept);
    socket.on('ice-candidate', listenerIce);
    socket.on('call-ended', listenerEnd);

    return () => {
      socket.off('call-accepted', listenerAccept);
      socket.off('ice-candidate', listenerIce);
      socket.off('call-ended', listenerEnd);
    };
  }, [handleCallAccepted, handleIceCandidate, endCall]);

  return { startCall, acceptCall, endCall, toggleMute, toggleCamera };
}
