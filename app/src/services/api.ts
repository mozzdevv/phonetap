// PhoneTap — API Client Service
import { signMessage } from './crypto';
import { getUser } from './storage';
import { API_BASE_URL } from '../utils/constants';
import { decodeBase64 } from 'tweetnacl-util';

interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

// Sign and send an authenticated request
async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse> {
  const user = await getUser();
  if (!user) return { ok: false, error: 'Not logged in' };

  const timestamp = Date.now().toString();
  const signPayload = `${options.method || 'GET'}:${path}:${timestamp}`;
  const signature = signMessage(signPayload, decodeBase64(user.signSecretKey));

  const headers: Record<string, string> = {
    'X-Public-Key': user.signPublicKey,
    'X-Timestamp': timestamp,
    'X-Signature': signature,
    ...(options.headers as Record<string, string> || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data.error || `HTTP ${response.status}` };
    }
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error' };
  }
}

// ─── Auth ────────────────────────────────────────────────
export async function registerUser(
  username: string,
  signPublicKey: string,
  boxPublicKey: string
): Promise<ApiResponse> {
  return authFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, signPublicKey, boxPublicKey }),
  });
}

// ─── Videos ──────────────────────────────────────────────
export async function uploadVideo(
  videoUri: string,
  durationMs: number
): Promise<ApiResponse<{ videoId: string; url: string }>> {
  const formData = new FormData();
  formData.append('video', {
    uri: videoUri,
    type: 'video/mp4',
    name: 'video.mp4',
  } as any);
  formData.append('durationMs', durationMs.toString());

  return authFetch('/videos/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function getVideosForUser(
  userPublicKey: string
): Promise<ApiResponse<{ videos: any[] }>> {
  return authFetch(`/videos/${encodeURIComponent(userPublicKey)}`);
}

export async function getFeedVideos(
  connectionKeys: string[]
): Promise<ApiResponse<{ videos: any[] }>> {
  return authFetch('/videos/feed', {
    method: 'POST',
    body: JSON.stringify({ connectionKeys }),
  });
}

// ─── Connections ─────────────────────────────────────────
export async function registerConnection(
  targetPublicKey: string
): Promise<ApiResponse> {
  return authFetch('/connections/add', {
    method: 'POST',
    body: JSON.stringify({ targetPublicKey }),
  });
}

export async function removeConnection(
  targetPublicKey: string
): Promise<ApiResponse> {
  return authFetch('/connections/remove', {
    method: 'POST',
    body: JSON.stringify({ targetPublicKey }),
  });
}

// ─── Messages ────────────────────────────────────────────
export async function sendEncryptedMessage(
  recipientPublicKey: string,
  encryptedContent: string,
  nonce: string
): Promise<ApiResponse> {
  return authFetch('/messages/send', {
    method: 'POST',
    body: JSON.stringify({ recipientPublicKey, encryptedContent, nonce }),
  });
}

export async function fetchMessages(
  conversationKey: string,
  since?: string
): Promise<ApiResponse<{ messages: any[] }>> {
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  return authFetch(`/messages/${encodeURIComponent(conversationKey)}${query}`);
}

// ─── QR Nonce Validation ─────────────────────────────────
export async function validateQRNonce(
  nonce: string,
  publicKey: string
): Promise<ApiResponse<{ valid: boolean }>> {
  return authFetch('/auth/validate-qr', {
    method: 'POST',
    body: JSON.stringify({ nonce, publicKey }),
  });
}
