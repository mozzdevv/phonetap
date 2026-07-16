// PhoneTap — Message Routes (Encrypted DM Relay)
import { Router } from 'express';
import { getDb } from '../models/database';
import { requireAuth, checkConnection, AuthenticatedRequest } from '../middleware/auth';
import { clients } from '../index';

const router = Router();

// POST /api/messages/send — Send an encrypted message
router.post('/send', requireAuth, (req: AuthenticatedRequest, res) => {
  const { recipientPublicKey, encryptedContent, nonce } = req.body;
  const senderKey = req.userPublicKey!;

  if (!recipientPublicKey || !encryptedContent || !nonce) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Must be connected
  if (!checkConnection(senderKey, recipientPublicKey)) {
    return res.status(403).json({ error: 'Not connected to recipient' });
  }

  const db = getDb();
  db.prepare(
    'INSERT INTO messages (sender_key, recipient_key, encrypted_content, nonce) VALUES (?, ?, ?, ?)'
  ).run(senderKey, recipientPublicKey, encryptedContent, nonce);

  // Try real-time delivery via WebSocket
  const recipientWs = clients.get(recipientPublicKey);
  if (recipientWs && recipientWs.readyState === 1) {
    recipientWs.send(JSON.stringify({
      type: 'dm',
      senderKey,
      encryptedContent,
      nonce,
      timestamp: new Date().toISOString(),
    }));
  }

  res.json({ success: true });
});

// GET /api/messages/:conversationKey — Fetch messages for a conversation
router.get('/:conversationKey', requireAuth, (req: AuthenticatedRequest, res) => {
  const { conversationKey } = req.params;
  const userKey = req.userPublicKey!;
  const sinceRaw = req.query.since;
  const since = typeof sinceRaw === 'string' ? sinceRaw : undefined;

  // Must be connected
  if (!checkConnection(userKey, String(conversationKey))) {
    return res.status(403).json({ error: 'Not connected to this user' });
  }

  const db = getDb();
  let query = `
    SELECT sender_key, encrypted_content, nonce, created_at
    FROM messages
    WHERE (sender_key = ? AND recipient_key = ?)
       OR (sender_key = ? AND recipient_key = ?)
  `;
  const params: any[] = [userKey, conversationKey, conversationKey, userKey];

  if (since) {
    query += ' AND created_at > ?';
    params.push(since);
  }

  query += ' ORDER BY created_at ASC LIMIT 200';

  const messages = db.prepare(query).all(...params);

  const result = (messages as any[]).map(m => ({
    senderKey: m.sender_key,
    encryptedContent: m.encrypted_content,
    nonce: m.nonce,
    createdAt: m.created_at,
    isMine: m.sender_key === userKey,
  }));

  res.json({ messages: result });
});

export default router;
