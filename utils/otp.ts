// Safely bind Buffer globally across both SSR server execution and browser evaluation
if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
  globalThis.Buffer = require('buffer').Buffer;
}

import { authenticator } from '@otplib/preset-browser';
import QRCode from 'qrcode';

/**
 * Generates a random base32 secret seed for a user's authenticator app.
 */
export function generateTOTPSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Creates a standard URI string that authenticator apps parse to setup accounts.
 */
export function getTOTPAuthURI(username: string, issuer: string, secret: string): string {
  return authenticator.keyuri(username, issuer, secret);
}

/**
 * Converts a TOTP Auth URI into a scannable visual QR Code Data URL.
 */
export async function generateQRCodeDataURL(authURI: string): Promise<string> {
  try {
    return await QRCode.toDataURL(authURI);
  } catch (err) {
    console.error('OTP Core: Failed to generate QR string matrix.', err);
    throw err;
  }
}

/**
 * Verifies a 6-digit real-time token entered by the user against their secret seed.
 */
export function verifyTOTPToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (err) {
    return false;
  }
}

/**
 * Generates a pristine set of random backup recovery alpha-numeric codes.
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 5; i++) {
    const segment1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const segment2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    codes.push(`${segment1}-${segment2}`);
  }
  return codes;
}