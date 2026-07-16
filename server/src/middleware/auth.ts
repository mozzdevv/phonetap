// PhoneTap — Auth Middleware (Signature Verification)
import { Request, Response, NextFunction } from 'express';
import nacl from 'tweetnacl';
import { decodeBase64 } from 'tweetnacl-util';
import { getDb } from '../models/database';

const MAX_TIMESTAMP_AGE_MS = 30_000; // 30 seconds

export interface AuthenticatedRequest extends Request {
  userPublicKey?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const publicKeyBase64 = req.headers['x-public-key'] as string;
  const timestamp = req.headers['x-timestamp'] as string;
  const signatureBase64 = req.headers['x-signature'] as string;

  if (!publicKeyBase64 || !timestamp || !signatureBase64) {
    res.status(401).json({ error: 'Missing auth headers' });
    return;
  }

  // Check timestamp freshness
  const tsAge = Date.now() - parseInt(timestamp, 10);
  if (isNaN(tsAge) || tsAge > MAX_TIMESTAMP_AGE_MS || tsAge < -5000) {
    res.status(401).json({ error: 'Timestamp expired or invalid' });
    return;
  }

  // Verify signature
  try {
    const publicKey = decodeBase64(publicKeyBase64);
    const signature = decodeBase64(signatureBase64);
    const message = `${req.method}:${req.path}:${timestamp}`;
    const messageBytes = new TextEncoder().encode(message);

    const valid = nacl.sign.detached.verify(messageBytes, signature, publicKey);
    if (!valid) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    req.userPublicKey = publicKeyBase64;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Auth verification failed' });
  }
}

// Check if two users are connected
export function checkConnection(userKey: string, targetKey: string): boolean {
  const db = getDb();
  const row = db.prepare(
    'SELECT 1 FROM connections WHERE user_key = ? AND target_key = ?'
  ).get(userKey, targetKey);
  return !!row;
}
