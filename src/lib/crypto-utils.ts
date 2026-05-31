import { createHash, randomBytes } from 'node:crypto';

/**
 * Generates a random secure password string.
 */
export function generateRandomPassword(length = 12): string {
  return randomBytes(length)
    .toString('base64url')
    .slice(0, length);
}

/**
 * Hashes a password using SHA-256.
 * FIXME: For production, use bcrypt or argon2, but for this MVP/prototype
 * as per guidelines we use standard node crypto if needed.
 */
export function hashPassword(password: string): string {
  return createHash('sha256')
    .update(password)
    .digest('hex');
}

/**
 * Generates a random UUID/ID.
 */
export function generateId(): string {
  return randomBytes(16)
    .toString('hex');
}
