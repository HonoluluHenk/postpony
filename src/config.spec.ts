import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
