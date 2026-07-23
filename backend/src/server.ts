import dns from 'dns';
try {
  // Override DNS servers to use public ones (Google and Cloudflare) to fix querySrv ECONNREFUSED in local networks
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('⚠️ Failed to set public DNS servers, using system default resolver:', e);
}

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import apiRouter from './routes';

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*', // Allow all origins for local development ease
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json());

// Initialize Socket.IO
export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Join personal notification room (userId as room name)
  socket.on('join_user_room', (userId: string) => {
    socket.join(userId);
    console.log(`User ${userId} joined their personal room.`);
  });

  // Join a specific conversation room for real-time chat
  socket.on('join_conversation', (conversationId: string) => {
    socket.join(`conv_${conversationId}`);
    console.log(`Socket ${socket.id} joined conversation room: conv_${conversationId}`);
  });

  // Leave a conversation room
  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(`conv_${conversationId}`);
  });

  // Typing indicator — broadcast to conversation room (not back to sender)
  socket.on('typing', ({ conversationId, userId, userName }: { conversationId: string; userId: string; userName: string }) => {
    socket.to(`conv_${conversationId}`).emit('user_typing', { userId, userName, conversationId });
  });

  // Stop typing indicator
  socket.on('stop_typing', ({ conversationId, userId }: { conversationId: string; userId: string }) => {
    socket.to(`conv_${conversationId}`).emit('user_stopped_typing', { userId, conversationId });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Register API router
app.use('/api', apiRouter);

// Root endpoint for friendly greeting
app.get('/', (req, res) => {
  res.send('GrowSync Backend is running! Access /health-check to verify status or /api for endpoints.');
});

// Health check endpoint
app.get('/health-check', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Start HTTP server (Express + Socket.io)
server.listen(PORT, () => {
  console.log(`🚀 GrowSync Backend running on http://localhost:${PORT}`);
});

mongoose.connect(process.env.MONGODB_URI as string, {
  serverSelectionTimeoutMS: 3000,
  bufferCommands: false,
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB. Backend running in offline/fallback mode.', err.message || err);
  });
