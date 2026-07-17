// PhoneTap — Local SQLite Storage Service
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'phonetap.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initTables(db);
  }
  return db;
}

async function initTables(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS user (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL,
      display_name TEXT,
      sign_public_key TEXT NOT NULL,
      sign_secret_key TEXT NOT NULL,
      box_public_key TEXT NOT NULL,
      box_secret_key TEXT NOT NULL,
      is_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_key TEXT NOT NULL UNIQUE,
      box_public_key TEXT NOT NULL,
      username TEXT NOT NULL,
      tap_count INTEGER DEFAULT 1,
      last_tapped_at TEXT DEFAULT (datetime('now')),
      connected_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT UNIQUE,
      local_uri TEXT,
      owner_public_key TEXT NOT NULL,
      thumbnail_uri TEXT,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_key TEXT NOT NULL,
      sender_key TEXT NOT NULL,
      encrypted_content TEXT NOT NULL,
      nonce TEXT NOT NULL,
      is_mine INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_connections_pubkey ON connections(public_key);
    CREATE INDEX IF NOT EXISTS idx_videos_owner ON videos(owner_public_key);
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_key);
  `);
}

// ─── User Operations ─────────────────────────────────────
export interface LocalUser {
  username: string;
  displayName?: string;
  signPublicKey: string;
  signSecretKey: string;
  boxPublicKey: string;
  boxSecretKey: string;
  isVerified: boolean;
}

export async function saveUser(user: LocalUser): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO user (id, username, display_name, sign_public_key, sign_secret_key, box_public_key, box_secret_key, is_verified)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
    [user.username, user.displayName ?? null, user.signPublicKey, user.signSecretKey, user.boxPublicKey, user.boxSecretKey, user.isVerified ? 1 : 0]
  );
}

export async function getUser(): Promise<LocalUser | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>('SELECT * FROM user WHERE id = 1');
  if (!row) return null;
  return {
    username: row.username,
    displayName: row.display_name,
    signPublicKey: row.sign_public_key,
    signSecretKey: row.sign_secret_key,
    boxPublicKey: row.box_public_key,
    boxSecretKey: row.box_secret_key,
    isVerified: row.is_verified === 1,
  };
}

export async function setVerified(verified: boolean): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE user SET is_verified = ? WHERE id = 1', [verified ? 1 : 0]);
}

// ─── Connection Operations ───────────────────────────────
export interface Connection {
  publicKey: string;
  boxPublicKey: string;
  username: string;
  tapCount?: number;
  lastTappedAt?: string;
  connectedAt: string;
}

export async function addConnection(conn: Connection): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  
  // Use UPSERT (INSERT ... ON CONFLICT) to update tap count if they reconnect
  await database.runAsync(
    `INSERT INTO connections (public_key, box_public_key, username, connected_at, last_tapped_at, tap_count)
     VALUES (?, ?, ?, ?, ?, 1)
     ON CONFLICT(public_key) DO UPDATE SET 
       tap_count = tap_count + 1,
       last_tapped_at = excluded.last_tapped_at`,
    [conn.publicKey, conn.boxPublicKey, conn.username, conn.connectedAt, now]
  );
}

export async function getConnections(): Promise<Connection[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>('SELECT * FROM connections ORDER BY connected_at DESC');
  return rows.map(r => ({
    publicKey: r.public_key,
    boxPublicKey: r.box_public_key,
    username: r.username,
    tapCount: r.tap_count,
    lastTappedAt: r.last_tapped_at,
    connectedAt: r.connected_at,
  }));
}

export async function isConnected(publicKey: string): Promise<boolean> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>(
    'SELECT 1 FROM connections WHERE public_key = ?',
    [publicKey]
  );
  return !!row;
}

export async function removeConnection(publicKey: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'DELETE FROM connections WHERE public_key = ?',
    [publicKey]
  );
  // Also delete messages
  await database.runAsync(
    'DELETE FROM messages WHERE conversation_key = ?',
    [publicKey]
  );
}

export async function getConnectionCount(): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>('SELECT COUNT(*) as count FROM connections');
  return row?.count ?? 0;
}

// ─── Video Operations ────────────────────────────────────
export interface VideoRecord {
  serverId?: string;
  localUri?: string;
  ownerPublicKey: string;
  thumbnailUri?: string;
  durationMs?: number;
  createdAt: string;
}

export async function saveVideo(video: VideoRecord): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO videos (server_id, local_uri, owner_public_key, thumbnail_uri, duration_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [video.serverId ?? null, video.localUri ?? null, video.ownerPublicKey, video.thumbnailUri ?? null, video.durationMs ?? null, video.createdAt]
  );
}

export async function getVideosByOwner(ownerPublicKey: string): Promise<VideoRecord[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM videos WHERE owner_public_key = ? ORDER BY created_at DESC',
    [ownerPublicKey]
  );
  return rows.map(r => ({
    serverId: r.server_id,
    localUri: r.local_uri,
    ownerPublicKey: r.owner_public_key,
    thumbnailUri: r.thumbnail_uri,
    durationMs: r.duration_ms,
    createdAt: r.created_at,
  }));
}

export async function getFeedVideos(): Promise<VideoRecord[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT v.* FROM videos v
     INNER JOIN connections c ON v.owner_public_key = c.public_key
     ORDER BY v.created_at DESC
     LIMIT 50`
  );
  return rows.map(r => ({
    serverId: r.server_id,
    localUri: r.local_uri,
    ownerPublicKey: r.owner_public_key,
    thumbnailUri: r.thumbnail_uri,
    durationMs: r.duration_ms,
    createdAt: r.created_at,
  }));
}

// ─── Message Operations ──────────────────────────────────
export interface MessageRecord {
  conversationKey: string;
  senderKey: string;
  encryptedContent: string;
  nonce: string;
  isMine: boolean;
  createdAt: string;
}

export async function saveMessage(msg: MessageRecord): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO messages (conversation_key, sender_key, encrypted_content, nonce, is_mine, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [msg.conversationKey, msg.senderKey, msg.encryptedContent, msg.nonce, msg.isMine ? 1 : 0, msg.createdAt]
  );
}

export async function getMessages(conversationKey: string): Promise<MessageRecord[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM messages WHERE conversation_key = ? ORDER BY created_at ASC',
    [conversationKey]
  );
  return rows.map(r => ({
    conversationKey: r.conversation_key,
    senderKey: r.sender_key,
    encryptedContent: r.encrypted_content,
    nonce: r.nonce,
    isMine: r.is_mine === 1,
    createdAt: r.created_at,
  }));
}

export async function getConversations(): Promise<{ key: string; username: string; lastMessage: string }[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT m.conversation_key, c.username,
            (SELECT m2.encrypted_content FROM messages m2
             WHERE m2.conversation_key = m.conversation_key
             ORDER BY m2.created_at DESC LIMIT 1) as last_message
     FROM messages m
     INNER JOIN connections c ON m.conversation_key = c.public_key
     GROUP BY m.conversation_key
     ORDER BY MAX(m.created_at) DESC`
  );
  return rows.map(r => ({
    key: r.conversation_key,
    username: r.username,
    lastMessage: r.last_message,
  }));
}
