// PhoneTap — Database Setup (SQLite)
import Database from 'better-sqlite3';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'phonetap.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDatabase(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      sign_public_key TEXT NOT NULL UNIQUE,
      box_public_key TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_key TEXT NOT NULL,
      target_key TEXT NOT NULL,
      tap_count INTEGER DEFAULT 1,
      last_tapped_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_key, target_key)
    );

    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      owner_key TEXT NOT NULL,
      filename TEXT NOT NULL,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_key TEXT NOT NULL,
      recipient_key TEXT NOT NULL,
      encrypted_content TEXT NOT NULL,
      nonce TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS qr_nonces (
      nonce TEXT PRIMARY KEY,
      public_key TEXT NOT NULL,
      used_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_connections_user ON connections(user_key);
    CREATE INDEX IF NOT EXISTS idx_connections_target ON connections(target_key);
    CREATE INDEX IF NOT EXISTS idx_videos_owner ON videos(owner_key);
    CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_key);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_key);
  `);

  console.log('📦 Database initialized');
}
