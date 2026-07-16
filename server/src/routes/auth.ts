// PhoneTap — Auth Routes
import { Router } from 'express';
import { getDb } from '../models/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { clients } from '../index';

const router = Router();

// POST /api/auth/register — Register a new user
router.post('/register', requireAuth, (req: AuthenticatedRequest, res) => {
  const { username, signPublicKey, boxPublicKey } = req.body;

  if (!username || !signPublicKey || !boxPublicKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }

  const db = getDb();
  try {
    db.prepare(
      'INSERT INTO users (username, sign_public_key, box_public_key) VALUES (?, ?, ?)'
    ).run(username, signPublicKey, boxPublicKey);

    res.status(201).json({ success: true, username });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username or key already registered' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/validate-qr — Validate a QR nonce (replay protection)
router.post('/validate-qr', (req, res) => {
  const { nonce, publicKey } = req.body;

  if (!nonce || !publicKey) {
    return res.status(400).json({ error: 'Missing nonce or publicKey' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT 1 FROM qr_nonces WHERE nonce = ?').get(nonce);

  if (existing) {
    return res.json({ valid: false, reason: 'Nonce already used' });
  }

  db.prepare('INSERT INTO qr_nonces (nonce, public_key) VALUES (?, ?)').run(nonce, publicKey);

  // Clean up old nonces (> 1 hour)
  db.prepare("DELETE FROM qr_nonces WHERE used_at < datetime('now', '-1 hour')").run();

  res.json({ valid: true });
});

// POST /api/auth/connections/add — Register a new connection
router.post('/connections/add', requireAuth, (req: AuthenticatedRequest, res) => {
  const { targetPublicKey } = req.body;
  const userKey = req.userPublicKey!;

  if (!targetPublicKey) {
    return res.status(400).json({ error: 'Missing targetPublicKey' });
  }

  const db = getDb();
  try {
    // Add bidirectional connection
    const insert = db.prepare(
      'INSERT OR IGNORE INTO connections (user_key, target_key) VALUES (?, ?)'
    );
    insert.run(userKey, targetPublicKey);
    insert.run(targetPublicKey, userKey);

    // Notify the target user via WebSocket
    const recipientWS = clients.get(targetPublicKey);
    if (recipientWS && recipientWS.readyState === 1) {
      const scannerUser = db.prepare('SELECT username, box_public_key FROM users WHERE sign_public_key = ?').get(userKey) as any;
      if (scannerUser) {
        recipientWS.send(JSON.stringify({
          type: 'new_connection',
          publicKey: userKey,
          boxPublicKey: scannerUser.box_public_key,
          username: scannerUser.username
        }));
      }
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to add connection' });
  }
});

// GET /api/auth/user/:publicKey — Get user info
router.get('/user/:publicKey', (req, res) => {
  const { publicKey } = req.params;
  const db = getDb();
  const user = db.prepare(
    'SELECT username, sign_public_key, box_public_key, created_at FROM users WHERE sign_public_key = ?'
  ).get(publicKey);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

export default router;
