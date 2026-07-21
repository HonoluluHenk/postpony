import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

export function generateRandomPassword(length = 12): string {
  return randomBytes(length)
    .toString('base64url')
    .slice(0, length);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateId(): string {
  return randomBytes(16)
    .toString('hex');
}
