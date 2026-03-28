const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve the frontend build
const buildPath = path.join(__dirname, '../client/dist');
app.use(express.static(buildPath));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// In-memory user store: socketId -> username
const users = {};

// Helper: broadcast the current online users list
function broadcastUsers() {
  const userList = Object.entries(users).map(([id, username]) => ({
    socketId: id,
    username,
  }));
  io.emit('users-list', userList);
}

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // ── Registration ──────────────────────────────────────────────────────────
  socket.on('register', (username) => {
    // Kick any existing socket with the same username
    const existing = Object.entries(users).find(([, u]) => u === username);
    if (existing) {
      const [oldId] = existing;
      if (oldId !== socket.id) {
        io.to(oldId).emit('force-disconnect', 'Another tab registered with your username.');
        delete users[oldId];
      }
    }
    users[socket.id] = username;
    console.log(`[register] ${username} (${socket.id})`);
    socket.emit('registered', { socketId: socket.id, username });
    broadcastUsers();
  });

  // ── Call signaling ────────────────────────────────────────────────────────

  // Caller → callee: initiate call
  socket.on('call-user', ({ toSocketId, offer, fromUsername }) => {
    console.log(`[call] ${users[socket.id]} → ${users[toSocketId]}`);
    io.to(toSocketId).emit('incoming-call', {
      fromSocketId: socket.id,
      fromUsername,
      offer,
    });
  });

  // Callee → caller: accepted with answer
  socket.on('accept-call', ({ toSocketId, answer }) => {
    console.log(`[accept] ${users[socket.id]} accepted call from ${users[toSocketId]}`);
    io.to(toSocketId).emit('call-accepted', { answer });
  });

  // Callee → caller: rejected
  socket.on('reject-call', ({ toSocketId }) => {
    console.log(`[reject] ${users[socket.id]} rejected call from ${users[toSocketId]}`);
    io.to(toSocketId).emit('call-rejected', { byUsername: users[socket.id] });
  });

  // Either peer: end an active call
  socket.on('end-call', ({ toSocketId }) => {
    console.log(`[end] ${users[socket.id]} ended call with ${users[toSocketId]}`);
    io.to(toSocketId).emit('call-ended');
  });

  // ICE candidate relay
  socket.on('ice-candidate', ({ toSocketId, candidate }) => {
    io.to(toSocketId).emit('ice-candidate', { candidate });
  });

  // Chat message relay
  socket.on('send-chat-message', ({ toSocketId, message, timestamp }) => {
    console.log(`[chat] ${users[socket.id]} says: ${message}`);
    io.to(toSocketId).emit('chat-message', {
      fromSocketId: socket.id,
      fromUsername: users[socket.id],
      message,
      timestamp
    });
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const username = users[socket.id];
    if (username) {
      console.log(`[-] ${username} disconnected`);
      delete users[socket.id];
      broadcastUsers();
    }
  });
});

app.get('/health', (_, res) => res.json({ status: 'ok', users: Object.values(users) }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅  Signaling server running on http://localhost:${PORT}`);
});
