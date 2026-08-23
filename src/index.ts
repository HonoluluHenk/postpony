import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { createServer as createHttpsServer } from 'node:https';
import path from 'path';
import config from './config';
import { buildApp } from './build-app';
import { logger } from './lib/logger';
import { SqliteSessionStore } from './lib/session-store';

const dbUrl = config.get('db-url');
const dbAuthToken = config.get('db-auth-token');
// ponytail: ensure the data directory exists for the default SQLite file path;
// upgrade to orchestrated setup script if additional resources are needed.
const dbPath = dbUrl.startsWith('file:') ? dbUrl.slice(5) : null;
if (dbPath) {
  const dbDir = path.dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, {recursive: true});
  }
}
const sessionStore = new SqliteSessionStore(dbUrl, dbAuthToken || undefined);
await sessionStore.migrate();

const app = buildApp(sessionStore);

// Resolve absolute paths to avoid CWD differences between dev and test runners
const publicDir = path.resolve(process.cwd(), 'src/public');

// Node-only: Workers Assets serves static files on Cloudflare. Kept out of buildApp.
app.use('/assets/*', serveStatic({root: publicDir}));

const port = config.get('port');
const hostname = config.get('hostname');
const tlsEnabled = config.get('tls-enabled');

let server: ReturnType<typeof serve>;
const scheme = tlsEnabled ? 'https' : 'http';
if (tlsEnabled) {
  const certPath = path.join(process.cwd(), `developer-local-settings/conf/certs/${hostname}.pem`);
  const keyPath = path.join(process.cwd(), `developer-local-settings/conf/certs/${hostname}.key`);

  if (!(existsSync(certPath) && existsSync(keyPath))) {
    const missingFile = !existsSync(certPath) ? certPath : keyPath;
    throw new Error(`SSL certificate file is missing: ${missingFile}. Run 'npm run certs' to generate certificates.`);
  }

  server = serve({
    hostname,
    port,
    fetch: app.fetch,
    createServer: createHttpsServer,
    serverOptions: {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath),
    },
  });
} else {
  server = serve({hostname, port, fetch: app.fetch});
}

console.log(`Server is running on ${scheme}://${hostname}:${port}`);
logger.info({hostname, port, tls: tlsEnabled}, 'Server started');

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});

