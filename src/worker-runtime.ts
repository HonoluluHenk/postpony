// ponytail: Cloudflare Workers have no global `process`. This shim is imported
// first by worker.ts so modules that read `process.env` (convict config) load
// cleanly. Under Node (`process` already defined) it is a no-op.
const g = globalThis as unknown as { process?: { env: Record<string, string | undefined> } };

if (typeof g.process === 'undefined') {
  g.process = { env: {} };
}

/**
 * Merges Worker env bindings into `process.env` so code that reads
 * `process.env` (convict config) sees them. No-op under Node where the real
 * `process.env` already wins (the spread keeps existing values).
 */
export function applyWorkerEnv(vars: Record<string, string | undefined>): void {
  const global = globalThis as unknown as { process: { env: Record<string, string | undefined> } };
  if (typeof global.process === 'undefined') {
    global.process = { env: {} };
  }
  global.process.env = {...global.process.env, ...vars};
}
