const PBKDF2_ITERATIONS = 200_000;
const SALT_LENGTH_BYTES = 16;
const HASH_LENGTH_BYTES = 64;

const webcrypto = globalThis.crypto;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await webcrypto.subtle.deriveBits(
    {name: 'PBKDF2', salt, iterations, hash: 'SHA-256'},
    keyMaterial,
    HASH_LENGTH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const hash = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function comparePassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length < 4 || parts[0] !== 'pbkdf2' || !parts[1] || !parts[2] || !parts[3]) {
    return false;
  }
  const salt = fromBase64Url(parts[2]);
  const expected = fromBase64Url(parts[3]);
  const hash = await deriveKey(password, salt, Number(parts[1]));
  return safeEqual(hash, expected);
}

function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= Number(a[i]) ^ Number(b[i]);
  }
  return diff === 0;
}

export function generateId(): string {
  return webcrypto.randomUUID();
}

export function generateRandomPassword(length = 12): string {
  const bytes = webcrypto.getRandomValues(new Uint8Array(length));
  return toBase64Url(bytes).slice(0, length);
}
