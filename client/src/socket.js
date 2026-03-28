import { io } from 'socket.io-client';

// Auto-detect the backend URL based on where the app is hosted
const SIGNALING_SERVER = process.env.NODE_ENV === 'production' 
  ? window.location.origin 
  : 'http://127.0.0.1:3001';

export const socket = io(SIGNALING_SERVER, {
  autoConnect: false
});
