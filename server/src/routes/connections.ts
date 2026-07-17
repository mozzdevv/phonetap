import { Router, Response } from 'express';
import { getDb } from '../models/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { clients } from '../index';

const router = Router();

router.post('/add', requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  const { targetPublicKey } = req.body;
  const userKey = req.userPublicKey;

  if (!userKey) return res.status(401).json({ error: 'Unauthorized' });

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

router.post('/remove', requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  const { targetPublicKey } = req.body;
  const userKey = req.userPublicKey;

  if (!userKey) return res.status(401).json({ error: 'Unauthorized' });

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
