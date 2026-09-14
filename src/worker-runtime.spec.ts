import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyWorkerEnv } from './worker-runtime';

interface ProcessGlobal {
  process: { env: Record<string, string | undefined>; pid: number };
}

describe('applyWorkerEnv', () => {
  const original = {...process.env};

  afterEach(() => {
    process.env = {...original};
    vi.unstubAllGlobals();
  });

  it('merges vars into process.env without dropping existing values', () => {
    process.env['PRE_EXISTING'] = 'yes';
    applyWorkerEnv({APP_DB_URL: 'libsql://example.turso.io'});
    expect(process.env['PRE_EXISTING']).toBe('yes');
    expect(process.env['APP_DB_URL']).toBe('libsql://example.turso.io');
  });
});

describe('worker-runtime process shim', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('creates a process.env when the module loads without a global process', async () => {
    vi.resetModules();
    vi.stubGlobal('process', undefined);
    await import('./worker-runtime');
    expect((globalThis as unknown as ProcessGlobal).process.env)
      .toEqual({});
  });

  it('bootstraps process.env from scratch inside applyWorkerEnv when process is missing', async () => {
    vi.resetModules();
    vi.stubGlobal('process', undefined);
    await import('./worker-runtime');
    // simulate a runtime that lost global.process between load and call
    vi.stubGlobal('process', undefined);
    const mod = await import('./worker-runtime');
    mod.applyWorkerEnv({APP_DB_URL: 'libsql://example.turso.io'});
    expect((globalThis as unknown as ProcessGlobal).process.env)
      .toEqual({APP_DB_URL: 'libsql://example.turso.io'});
  });

  it('leaves an existing process untouched on load', () => {
    // the module has already been imported by this spec file; the shim must
    // NOT have replaced the real Node process
    const before = process.pid;
    expect((globalThis as unknown as ProcessGlobal).process.pid).toBe(before);
  });
});