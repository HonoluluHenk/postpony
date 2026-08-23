import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL = process.env['APP_TLS_ENABLED'];

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env['APP_TLS_ENABLED'];
  } else {
    process.env['APP_TLS_ENABLED'] = ORIGINAL;
  }
  vi.resetModules();
});

describe('config: tls-enabled', () => {
  it('defaults to true when unset', async () => {
    delete process.env['APP_TLS_ENABLED'];
    vi.resetModules();
    const config = (await import('./config')).default;
    expect(config.get('tls-enabled')).toBe(true);
  });

  it('parses APP_TLS_ENABLED=false to false', async () => {
    process.env['APP_TLS_ENABLED'] = 'false';
    vi.resetModules();
    const config = (await import('./config')).default;
    expect(config.get('tls-enabled')).toBe(false);
  });

  it('parses APP_TLS_ENABLED=true to true', async () => {
    process.env['APP_TLS_ENABLED'] = 'true';
    vi.resetModules();
    const config = (await import('./config')).default;
    expect(config.get('tls-enabled')).toBe(true);
  });
});
