import { Router } from 'express';
import { getDb } from '../models/database';
import { authenticate } from '../middleware/auth';
import { clients } from '../index';

const router = Router();

router.post('/add', authenticate, (req: any, res) => {
  const { targetPublicKey } = req.body;
  const userKey = req.user.signPublicKey;

  try {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO connections (user_key, target_key, created_at, tap_count, last_tapped_at)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(user_key, target_key) DO UPDATE SET
        tap_count = tap_count + 1,
        last_tapped_at = excluded.last_tapped_at
    `).run(userKey, targetPublicKey, now, now);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/remove', authenticate, (req: any, res) => {
  const { targetPublicKey } = req.body;
  const userKey = req.user.signPublicKey;

  try {
    const db = getDb();
    db.prepare(`DELETE FROM connections WHERE user_key = ? AND target_key = ?`).run(userKey, targetPublicKey);

    // Anonymous real-time notification
    const targetWs = clients.get(targetPublicKey);
    if (targetWs && targetWs.readyState === 1) {
      targetWs.send(JSON.stringify({
        type: 'notification',
        message: 'Someone has disconnected with you.'
      }));
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
