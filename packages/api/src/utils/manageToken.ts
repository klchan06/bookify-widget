import crypto from 'crypto';
import { env } from './env.js';

export function generateManageToken(bookingId: string): string {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 90; // 90 days
  const payload = `${bookingId}.${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyManageToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [bookingId, expiresAt, signature] = parts;

  const expected = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${bookingId}.${expiresAt}`)
    .digest('base64url');

  if (signature !== expected) return null;
  if (parseInt(expiresAt) < Date.now()) return null;

  return bookingId;
}
