// PhoneTap — Cryptographic Service
// Ed25519 for identity/signing, X25519 for E2E encrypted DMs
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

export interface KeyPairs {
  signKeyPair: nacl.SignKeyPair;      // Ed25519 — identity & signing
  boxKeyPair: nacl.BoxKeyPair;        // X25519 — DM encryption
}

export interface SerializedKeys {
  signPublicKey: string;
  signSecretKey: string;
  boxPublicKey: string;
  boxSecretKey: string;
}

// Generate both key pairs for a new user
export function generateKeyPairs(): KeyPairs {
  return {
    signKeyPair: nacl.sign.keyPair(),
    boxKeyPair: nacl.box.keyPair(),
  };
}

// Serialize keys to base64 for storage
export function serializeKeys(keys: KeyPairs): SerializedKeys {
  return {
    signPublicKey: encodeBase64(keys.signKeyPair.publicKey),
    signSecretKey: encodeBase64(keys.signKeyPair.secretKey),
    boxPublicKey: encodeBase64(keys.boxKeyPair.publicKey),
    boxSecretKey: encodeBase64(keys.boxKeyPair.secretKey),
  };
}

// Restore keys from base64
export function deserializeKeys(serialized: SerializedKeys): KeyPairs {
  return {
    signKeyPair: {
      publicKey: decodeBase64(serialized.signPublicKey),
      secretKey: decodeBase64(serialized.signSecretKey),
    },
    boxKeyPair: {
      publicKey: decodeBase64(serialized.boxPublicKey),
      secretKey: decodeBase64(serialized.boxSecretKey),
    },
  };
}

// Sign a message with Ed25519
export function signMessage(message: string, secretKey: Uint8Array): string {
  const messageBytes = decodeUTF8(message);
  const signature = nacl.sign.detached(messageBytes, secretKey);
  return encodeBase64(signature);
}

// Verify a signed message
export function verifySignature(
  message: string,
  signatureBase64: string,
  publicKey: Uint8Array
): boolean {
  const messageBytes = decodeUTF8(message);
  const signature = decodeBase64(signatureBase64);
  return nacl.sign.detached.verify(messageBytes, signature, publicKey);
}

// Encrypt a DM message (NaCl box)
export function encryptMessage(
  plaintext: string,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): { ciphertext: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageBytes = decodeUTF8(plaintext);
  const encrypted = nacl.box(messageBytes, nonce, recipientPublicKey, senderSecretKey);

  if (!encrypted) throw new Error('Encryption failed');

  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  };
}

// Decrypt a DM message (NaCl box.open)
export function decryptMessage(
  ciphertextBase64: string,
  nonceBase64: string,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): string {
  const ciphertext = decodeBase64(ciphertextBase64);
  const nonce = decodeBase64(nonceBase64);
  const decrypted = nacl.box.open(ciphertext, nonce, senderPublicKey, recipientSecretKey);

  if (!decrypted) throw new Error('Decryption failed — invalid key or corrupted message');

  return encodeUTF8(decrypted);
}

// Generate a time-limited token for QR codes
export function generateQRPayload(
  publicKey: string,
  username: string,
  boxPublicKey: string,
  secretKey: Uint8Array,
  ttlMs: number = 2000
): string {
  const nonce = encodeBase64(nacl.randomBytes(16));
  const expiry = Date.now() + ttlMs;
  const payload = JSON.stringify({ publicKey, username, boxPublicKey, nonce, expiry });
  const signature = signMessage(payload, secretKey);
  return JSON.stringify({ payload, signature });
}

// Validate a QR payload hasn't expired
export function validateQRPayload(
  qrData: string,
  usedNonces: Set<string>
): { valid: boolean; data?: { publicKey: string; username: string; boxPublicKey: string; nonce: string } ; error?: string } {
  try {
    const { payload, signature } = JSON.parse(qrData);
    const data = JSON.parse(payload);
    const { publicKey, username, boxPublicKey, nonce, expiry } = data;

    // Check expiry
    if (Date.now() > expiry) {
      return { valid: false, error: 'QR code expired' };
    }

    // Check replay
    if (usedNonces.has(nonce)) {
      return { valid: false, error: 'QR code already used' };
    }

    // Verify signature
    const signerPublicKey = decodeBase64(publicKey);
    if (!verifySignature(payload, signature, signerPublicKey)) {
      return { valid: false, error: 'Invalid signature' };
    }

    usedNonces.add(nonce);
    return { valid: true, data: { publicKey, username, boxPublicKey, nonce } };
  } catch {
    return { valid: false, error: 'Invalid QR data' };
  }
}
