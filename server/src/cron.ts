import { getDb } from './models/database';
import { clients } from './index';

// Run every hour
const NUDGE_INTERVAL_MS = 60 * 60 * 1000;
// Nudge if haven't tapped in 7 days
const NUDGE_THRESHOLD_DAYS = 7;

export function startCronJobs() {
  setInterval(() => {
    try {
      const db = getDb();
      // Find connections older than threshold
      const rows = db.prepare(`
        SELECT user_key, target_key, tap_count, last_tapped_at 
        FROM connections 
        WHERE last_tapped_at < datetime('now', '-${NUDGE_THRESHOLD_DAYS} days')
      `).all() as any[];

      for (const row of rows) {
        // In MVP, we only send nudges via WS if they happen to be online
        // In a real app, this would trigger an Expo Push Notification
        const targetWs = clients.get(row.user_key);
        if (targetWs && targetWs.readyState === 1) {
          targetWs.send(JSON.stringify({
            type: 'nudge',
            message: "It's been a while since you tapped in with someone. Go say hi!"
          }));
        }
      }
    } catch (err) {
      console.error('Cron job error:', err);
    }
  }, NUDGE_INTERVAL_MS);
  
  console.log('⏰ Cron jobs started');
}
