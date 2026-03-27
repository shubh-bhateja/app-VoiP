import { io } from 'socket.io-client';

const SIGNALING_SERVER = 'http://127.0.0.1:3001';

export const socket = io(SIGNALING_SERVER, { autoConnect: false });
