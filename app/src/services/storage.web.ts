// PhoneTap — Storage Service (Web fallback — in-memory)
// On web, expo-sqlite WASM isn't available. This provides an
// in-memory fallback so the app can render for previewing.

// ─── Types (duplicated here to avoid importing from native) ──
export interface LocalUser {
  username: string;
  displayName?: string;
  signPublicKey: string;
  signSecretKey: string;
  boxPublicKey: string;
  boxSecretKey: string;
  isVerified: boolean;
}

export interface Connection {
  publicKey: string;
  boxPublicKey: string;
  username: string;
  connectedAt: string;
}

export interface VideoRecord {
  serverId?: string;
  localUri?: string;
  ownerPublicKey: string;
  thumbnailUri?: string;
  durationMs?: number;
  createdAt: string;
}

export interface MessageRecord {
  conversationKey: string;
  senderKey: string;
  encryptedContent: string;
  nonce: string;
  isMine: boolean;
  createdAt: string;
}

// ─── Persistence ───────────────────────────────────────────
const STORAGE_USER = 'phonetap_user';
const STORAGE_CONNECTIONS = 'phonetap_connections';
const STORAGE_VIDEOS = 'phonetap_videos';
const STORAGE_MESSAGES = 'phonetap_messages';

let memUser: LocalUser | null = null;
let memConnections: Connection[] = [];
let memVideos: VideoRecord[] = [];
let memMessages: MessageRecord[] = [];

try {
  memUser = JSON.parse(localStorage.getItem(STORAGE_USER) || 'null');
  memConnections = JSON.parse(localStorage.getItem(STORAGE_CONNECTIONS) || '[]');
  memVideos = JSON.parse(localStorage.getItem(STORAGE_VIDEOS) || '[]');
  memMessages = JSON.parse(localStorage.getItem(STORAGE_MESSAGES) || '[]');
} catch (e) {}

function persist() {
  try {
    localStorage.setItem(STORAGE_USER, JSON.stringify(memUser));
    localStorage.setItem(STORAGE_CONNECTIONS, JSON.stringify(memConnections));
    localStorage.setItem(STORAGE_VIDEOS, JSON.stringify(memVideos));
    localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(memMessages));
  } catch (e) {}
}

export async function saveUser(user: LocalUser): Promise<void> { memUser = user; persist(); }
export async function getUser(): Promise<LocalUser | null> { return memUser; }
export async function setVerified(verified: boolean): Promise<void> {
  if (memUser) { memUser.isVerified = verified; persist(); }
}

export async function addConnection(conn: Connection): Promise<void> {
  if (!memConnections.find(c => c.publicKey === conn.publicKey)) {
    memConnections.push(conn);
    persist();
  }
}
export async function getConnections(): Promise<Connection[]> { return [...memConnections]; }
export async function isConnected(publicKey: string): Promise<boolean> {
  return memConnections.some(c => c.publicKey === publicKey);
}
export async function getConnectionCount(): Promise<number> { return memConnections.length; }

export async function saveVideo(video: VideoRecord): Promise<void> { memVideos.push(video); persist(); }
export async function getVideosByOwner(ownerPublicKey: string): Promise<VideoRecord[]> {
  return memVideos.filter(v => v.ownerPublicKey === ownerPublicKey);
}
export async function getFeedVideos(): Promise<VideoRecord[]> { return [...memVideos]; }

export async function saveMessage(msg: MessageRecord): Promise<void> { memMessages.push(msg); persist(); }
export async function getMessages(conversationKey: string): Promise<MessageRecord[]> {
  return memMessages.filter(m => m.conversationKey === conversationKey);
}
export async function getConversations(): Promise<{ key: string; username: string; lastMessage: string }[]> {
  return [];
}
