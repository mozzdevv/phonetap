// PhoneTap — Video Routes
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../models/database';
import { requireAuth, checkConnection, AuthenticatedRequest } from '../middleware/auth';

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

const router = Router();

// POST /api/videos/upload — Upload a video
router.post('/upload', requireAuth, upload.single('video'), (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  const videoId = uuidv4();
  const durationMs = parseInt(req.body.durationMs, 10) || null;
  const db = getDb();

  db.prepare(
    'INSERT INTO videos (id, owner_key, filename, duration_ms) VALUES (?, ?, ?, ?)'
  ).run(videoId, req.userPublicKey, req.file.filename, durationMs);

  res.status(201).json({
    videoId,
    url: `/uploads/${req.file.filename}`,
    durationMs,
  });
});

// GET /api/videos/:userKey — Get videos for a user
router.get('/:userKey', requireAuth, (req: AuthenticatedRequest, res) => {
  const { userKey } = req.params;
  const requesterKey = req.userPublicKey!;

  // Must be connected or requesting own videos
  if (userKey !== requesterKey && !checkConnection(requesterKey, String(userKey))) {
    return res.status(403).json({ error: 'Not connected to this user' });
  }

  const db = getDb();
  const videos = db.prepare(
    'SELECT id, filename, duration_ms, created_at FROM videos WHERE owner_key = ? ORDER BY created_at DESC'
  ).all(userKey);

  const result = (videos as any[]).map(v => ({
    id: v.id,
    url: `/uploads/${v.filename}`,
    durationMs: v.duration_ms,
    createdAt: v.created_at,
  }));

  res.json({ videos: result });
});

// POST /api/videos/feed — Get feed videos from connected users
router.post('/feed', requireAuth, (req: AuthenticatedRequest, res) => {
  const { connectionKeys } = req.body;

  if (!Array.isArray(connectionKeys) || connectionKeys.length === 0) {
    return res.json({ videos: [] });
  }

  const db = getDb();
  const placeholders = connectionKeys.map(() => '?').join(',');
  const videos = db.prepare(
    `SELECT v.id, v.owner_key, v.filename, v.duration_ms, v.created_at, u.username
     FROM videos v
     LEFT JOIN users u ON v.owner_key = u.sign_public_key
     WHERE v.owner_key IN (${placeholders})
     ORDER BY v.created_at DESC
     LIMIT 50`
  ).all(...(connectionKeys as string[]));

  const result = (videos as any[]).map(v => ({
    id: v.id,
    ownerKey: v.owner_key,
    username: v.username,
    url: `/uploads/${v.filename}`,
    durationMs: v.duration_ms,
    createdAt: v.created_at,
  }));

  res.json({ videos: result });
});

export default router;
