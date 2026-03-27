# VoiceLink — Browser VoIP Calling

A full end-to-end VoIP app that works like WhatsApp calling, built with **WebRTC** + **Socket.io**.

## Quick Start

**Terminal 1 — Signaling Server**
```bash
cd server
npm install
node index.js
# → http://localhost:3001
```

**Terminal 2 — Frontend**
```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

Open **two browser tabs** at `http://localhost:5173`, enter different usernames, and call each other!

## How It Works

```
Browser A ──── WebRTC P2P Audio/Video ──── Browser B
     ↑                                         ↑
     └──── Socket.io Signaling Server (3001) ──┘
```

- **WebRTC** handles peer-to-peer audio/video directly between browsers
- **Socket.io** only relays handshake messages (offer/answer/ICE) — no media goes through the server
- **Google STUN** resolves NAT traversal

## Features
- 📹 Video + 🎤 Audio calls
- 🔇 Mute / 📷 Camera off toggles
- 📵 Accept / Reject incoming calls
- 🌐 Online users list, real-time updates
- 🌙 Dark mode glassmorphism UI
