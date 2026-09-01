import { describe, expect, it } from 'vitest';
import { comparePassword, generateId, generateRandomPassword, hashPassword } from './crypto-utils';

describe('crypto-utils (Web Crypto PBKDF2)', () => {
  it('hashes and verifies a password (round-trip)', async () => {
    const password = 'organizer-secret';
    const hash = await hashPassword(password);

    expect(hash.startsWith('pbkdf2$')).toBe(true);
    expect(await comparePassword(password, hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct-horse');
    expect(await comparePassword('battery-staple', hash)).toBe(false);
  });

  it('produces a unique salt per hash even for the same password', async () => {
    const password = 'same-password';
    const a = await hashPassword(password);
    const b = await hashPassword(password);

    expect(a).not.toBe(b);
    expect(await comparePassword(password, a)).toBe(true);
    expect(await comparePassword(password, b)).toBe(true);
  });

  it('rejects malformed hash strings', async () => {
    expect(await comparePassword('anything', 'not-a-hash')).toBe(false);
    expect(await comparePassword('anything', '')).toBe(false);
  });

  it('generates unique ids and non-empty passwords', () => {
    const idA = generateId();
    const idB = generateId();
    expect(idA).not.toBe(idB);
    expect(idA).toMatch(/^[0-9a-f-]{36}$/);

    const pw = generateRandomPassword(16);
    expect(pw).toHaveLength(16);
    expect(generateRandomPassword(16)).not.toBe(pw);
  });
});
