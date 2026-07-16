// PhoneTap — Server Entry Point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import http from 'http';
import { initDatabase } from './models/database';
import authRoutes from './routes/auth';
import videoRoutes from './routes/videos';
import messageRoutes from './routes/messages';
import connectionRoutes from './routes/connections';

const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Static files — serve uploaded videos
app.use('/uploads', express.static(UPLOAD_DIR));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'PhoneTap Server', version: '1.0.0' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/connections', connectionRoutes);

import { startCronJobs } from './cron';

// Initialize DB, start cron, and start server
initDatabase();
startCronJobs();

const server = http.createServer(app);

// WebSocket for real-time DM relay
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Map<string, any>(); // publicKey -> ws

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://localhost:${PORT}`);
  const publicKey = url.searchParams.get('publicKey');

  if (publicKey) {
    clients.set(publicKey, ws);
    console.log(`WS connected: ${publicKey.substring(0, 12)}...`);

    ws.on('close', () => {
      clients.delete(publicKey);
    });

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        // Relay encrypted message to recipient
        if (msg.type === 'dm' && msg.recipientKey) {
          const recipient = clients.get(msg.recipientKey);
          if (recipient && recipient.readyState === 1) {
            recipient.send(JSON.stringify({
              type: 'dm',
              senderKey: publicKey,
              encryptedContent: msg.encryptedContent,
              nonce: msg.nonce,
              timestamp: new Date().toISOString(),
            }));
          }
        }
      } catch {}
    });
  }
});

// Export clients map for use in message routes
export { clients };

server.listen(PORT, () => {
  console.log(`⚡ PhoneTap server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${UPLOAD_DIR}`);
});
