import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadDotEnv } from './config';

describe('loadDotEnv', () => {
  let dir: string;
  let cwd: string;

  beforeEach(() => {
    cwd = process.cwd();
    dir = mkdtempSync(join(tmpdir(), 'postpony-dotenv-'));
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(cwd);
    rmSync(dir, {recursive: true, force: true});
    delete process.env['POSTPONY_TEST_LOAD_DOT_ENV'];
  });

  it('loads .env values into process.env', async () => {
    writeFileSync(join(dir, '.env'), 'POSTPONY_TEST_LOAD_DOT_ENV=loaded123\n');
    await loadDotEnv();
    expect(process.env['POSTPONY_TEST_LOAD_DOT_ENV']).toBe('loaded123');
  });

  it('is a no-op when no .env exists', async () => {
    await expect(loadDotEnv()).resolves.toBeUndefined();
  });
});

describe('config required-field validation', () => {
  // The config singleton reads process.env at import time, so every scenario
  // re-imports the module with a fresh registry under a stubbed environment.
  async function freshConfig(): Promise<typeof import('./config')> {
    vi.resetModules();
    return await import('./config');
  }

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when db-url is missing', async () => {
    vi.stubEnv('APP_DB_URL', '');
    await expect(freshConfig())
      .rejects
      .toThrow('Missing required config: db-url');
  });

  it('throws when a non-file db-url carries no auth token', async () => {
    vi.stubEnv('APP_DB_URL', 'libsql://example.turso.io');
    vi.stubEnv('APP_DB_AUTH_TOKEN', '');
    await expect(freshConfig())
      .rejects
      .toThrow('Missing required config: db-auth-token');
  });

  it('accepts a tokenless non-file db-url when an auth token is provided', async () => {
    vi.stubEnv('APP_DB_URL', 'libsql://example.turso.io');
    vi.stubEnv('APP_DB_AUTH_TOKEN', 'secret');
    const {default: config} = await freshConfig();
    expect(config.get('db-url')).toBe('libsql://example.turso.io');
  });

  it('defaults the fixtures dir when use-fixtures is set without one', async () => {
    vi.stubEnv('APP_USE_FIXTURES', 'true');
    vi.stubEnv('APP_CLICK_TT_FIXTURES_DIR', '');
    const {default: config} = await freshConfig();
    expect(config.get('click-tt-fixtures-dir')).toBe('./src/lib/__fixtures__');
  });

  it('switches use-fixtures on when a fixtures dir is set without the flag', async () => {
    vi.stubEnv('APP_USE_FIXTURES', 'false');
    vi.stubEnv('APP_CLICK_TT_FIXTURES_DIR', '/tmp/custom-fixtures');
    const {default: config} = await freshConfig();
    expect(config.get('use-fixtures')).toBe(true);
    expect(config.get('click-tt-fixtures-dir')).toBe('/tmp/custom-fixtures');
  });
});
