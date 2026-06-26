import { argon2id } from 'hash-wasm';

/**
 * Helper function to safely convert any hex string into an exact 32-byte (256-bit) array buffer.
 * Slices long keys or zero-pads short keys to prevent Web Crypto API size mismatch crashes.
 */
function enforce32ByteKey(hexString: string): Uint8Array {
  const matches = hexString.match(/.{1,2}/g);
  const rawBytes = matches ? new Uint8Array(matches.map(byte => parseInt(byte, 16))) : new Uint8Array(0);
  
  const finalizedBuffer = new Uint8Array(32);
  finalizedBuffer.set(rawBytes.slice(0, 32));
  return finalizedBuffer;
}

/**
 * Derives a secure 32-byte master key using Argon2id parameters.
 * @param passphrase The user's master password input.
 * @param saltStr The unique user salt retrieved from the database profile.
 */
export async function deriveMasterKey(passphrase: string, saltStr: string): Promise<string> {
  if (!saltStr || saltStr.length < 8) {
    console.error("CRITICAL CRYPTO FAULT: Invalid salt string received:", saltStr);
    throw new Error(`Incoming salt string is too short or empty (${saltStr?.length || 0} chars).`);
  }

  const encoder = new TextEncoder();
  const saltBuffer = encoder.encode(saltStr);

  if (saltBuffer.length < 8) {
    console.error("CRITICAL CRYPTO FAULT: Derived byte array buffer is too short:", saltBuffer.length);
    throw new Error(`Salt buffer must be at least 8 bytes long. Got ${saltBuffer.length} bytes.`);
  }

  const hashHex = await argon2id({
    password: passphrase,
    salt: saltBuffer,
    parallelism: 1,
    iterations: 2,
    memorySize: 16384,
    hashLength: 32,
  });

  return hashHex;
}

/**
 * Encrypts arbitrary text data using a derived key string (AES-GCM format)
 */
export async function encryptData(plainText: string, keyHex: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(plainText);

    // Enforce 256-bit compliance before Web Crypto import
    const keyBuffer = enforce32ByteKey(keyHex);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      dataBytes
    );

    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error("Encryption pipeline failure:", err);
    throw new Error("Failed to secure local data context payload.");
  }
}

/**
 * Generates a fresh random project data key wrapped inside a master envelope
 */
export async function generateProjectEnvelope(masterKeyHex: string): Promise<{ encryptedDataKeyHex: string }> {
  const randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
  const projectDataKeyHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  const encryptedDataKeyHex = await encryptData(projectDataKeyHex, masterKeyHex);
  return { encryptedDataKeyHex };
}

/**
 * Unwraps a project key envelope using the master key context
 */
export async function unwrapProjectKey(wrappedKeyHex: string, masterKeyHex: string): Promise<string> {
  const combined = new Uint8Array(wrappedKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  // Enforce 256-bit compliance before Web Crypto import
  const keyBuffer = enforce32ByteKey(masterKeyHex);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );

  return Array.from(new Uint8Array(decryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
/**
 * Decrypts AES-GCM encrypted hex strings back into readable plain text strings.
 */
export async function decryptData(cipherTextHex: string, keyHex: string): Promise<string> {
  try {
    // Convert hex string back into a raw byte array
    const combined = new Uint8Array(cipherTextHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    // Extract the 12-byte initialization vector (IV) and the ciphertext payload
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    // Enforce 256-bit key structure compliance before Web Crypto processing
    const matches = keyHex.match(/.{1,2}/g);
    const rawBytes = matches ? new Uint8Array(matches.map(byte => parseInt(byte, 16))) : new Uint8Array(0);
    const keyBuffer = new Uint8Array(32);
    keyBuffer.set(rawBytes.slice(0, 32));

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt the byte sequence
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext
    );

    // Decode the bytes back to a standard plain-text string
    const decoder = new TextEncoder();
    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.error("Decryption pipeline failure:", err);
    throw new Error("Failed to unwrap local data context payload.");
  }
}