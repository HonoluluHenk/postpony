import { afterEach, describe, expect, it } from 'vitest';
import { applyWorkerEnv } from './worker-runtime';

describe('applyWorkerEnv', () => {
  const original = {...process.env};

  afterEach(() => {
    process.env = {...original};
  });

  it('merges vars into process.env without dropping existing values', () => {
    process.env['PRE_EXISTING'] = 'yes';
    applyWorkerEnv({APP_DB_URL: 'libsql://example.turso.io'});
    expect(process.env['PRE_EXISTING']).toBe('yes');
    expect(process.env['APP_DB_URL']).toBe('libsql://example.turso.io');
  });
});
