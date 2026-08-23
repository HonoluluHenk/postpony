import './src/worker-runtime';
import { applyWorkerEnv } from './src/worker-runtime';
import { buildApp } from './src/build-app';
import { SqliteSessionStore } from './src/lib/session-store';
import type { SessionStore } from './src/lib/session-store';

export interface Env {
  /** libSQL/Turso database URL (e.g. libsql://<db>.turso.io). */
  TURSO_DB_URL: string;
  /** Turso auth token — set via `wrangler secret put TURSO_DB_AUTH_TOKEN`. */
  TURSO_DB_AUTH_TOKEN: string;
  /** Workers Assets binding serving the static files from `src/public`. */
  ASSETS: { fetch(request: Request): Promise<Response> };
}

// ponytail: a single app instance is reused across requests. The store is
// created once and migrated lazily; upgrade to Durable Object isolation if
// per-request stores are ever needed.
let app: ReturnType<typeof buildApp> | undefined;
let store: SessionStore | undefined;

async function getApp(env: Env): Promise<ReturnType<typeof buildApp>> {
  if (!app || !store) {
    store = new SqliteSessionStore(env.TURSO_DB_URL, env.TURSO_DB_AUTH_TOKEN || undefined);
    await store.migrate();
    app = buildApp(store);
  }
  return app;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Expose Worker env to code that reads process.env (convict config).
    applyWorkerEnv({
      APP_DB_URL: env.TURSO_DB_URL,
      APP_DB_AUTH_TOKEN: env.TURSO_DB_AUTH_TOKEN || '',
      APP_TEMPLATE_SOURCE: 'memory',
    });
    const application = await getApp(env);
    const response = await application.fetch(request);
    // Fall back to Workers Assets for anything the app did not handle
    // (static CSS/JS under /assets/*). Hono returns 404 for unknown routes.
    if (response.status === 404) {
      return env.ASSETS.fetch(request);
    }
    return response;
  },
};
