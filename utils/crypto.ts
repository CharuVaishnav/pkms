/**
 * Phase 4: Text Encryption & Decryption Engine
 * Uses AES-GCM 256-bit encryption with a secure initialization vector (IV).
 */

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Derives a secure, non-extractable Master Key from a user's passphrase and database salt.
 */
export async function deriveMasterKey(passphrase: string, saltText: string): Promise<CryptoKey> {
  const passwordBuffer = textToBytes(passphrase).buffer as ArrayBuffer;
  const saltBuffer = textToBytes(saltText).buffer as ArrayBuffer;

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string of text using the derived Master Key.
 * Fixed for strict TypeScript compilation.
 */
export async function encryptText(plainText: string, key: CryptoKey): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  // Explicitly grab the underlying ArrayBuffer
  const encodedBuffer = textToBytes(plainText).buffer as ArrayBuffer;

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encodedBuffer // Type-safe BufferSource passed safely
  );

  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const cipherHex = Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  return `${ivHex}:${cipherHex}`;
}

/**
 * Decrypts an encrypted hex string back into readable text using the Master Key.
 * Fixed for strict TypeScript compilation.
 */
export async function decryptText(encryptedPackedText: string, key: CryptoKey): Promise<string> {
  const [ivHex, cipherHex] = encryptedPackedText.split(':');
  if (!ivHex || !cipherHex) return encryptedPackedText;

  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    cipherBytes.buffer as ArrayBuffer // Type-safe buffer extraction
  );

  return bytesToText(new Uint8Array(decryptedBuffer));
}