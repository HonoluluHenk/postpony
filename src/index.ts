import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import * as fs from 'fs';
import { Hono } from 'hono';

import { createServer as createHttpsServer } from 'node:https';
import * as path from 'path';
import { handleCreateGet } from './routes/create/get';
import { handleCreatePost } from './routes/create/post';
import { handleEditGet } from './routes/edit/id/get';
import { handleEditPlayersPost } from './routes/edit/id/players.post';
import { handleEditVenuePost } from './routes/edit/id/venue.post';
import { handleIndexGet } from './routes/index.get';

const app = new Hono();

app.use('/favicon.svg', serveStatic({path: './src/public/favicon.svg'}));
app.use('/css/*', serveStatic({root: './src/public'}));
app.use('/js/*', serveStatic({root: './src/public'}));

app.get('/', handleIndexGet);
app.get('/create', handleCreateGet);
app.post('/create', handleCreatePost);
app.post('/edit/:id/venue', handleEditVenuePost);
app.post('/edit/:id/players', handleEditPlayersPost);
app.get('/edit/:id', handleEditGet);

const port = parseInt(process.env['APP_PORT'] ?? '3000', 10);
const hostname = process.env['APP_HOSTNAME'] ?? 'game-scheduler.localhost';

const certPath = path.join(process.cwd(), `developer-local-settings/conf/certs/${hostname}.pem`);
const keyPath = path.join(process.cwd(), `developer-local-settings/conf/certs/${hostname}.key`);

if (!(fs.existsSync(certPath) && fs.existsSync(keyPath))) {
  const missingFile = !fs.existsSync(certPath) ? certPath : keyPath;
  throw new Error(`SSL certificate file is missing: ${missingFile}. Run 'npm run certs' to generate certificates.`);
}

const serverOptions = {
  hostname,
  port,
  fetch: app.fetch,
  createServer: createHttpsServer,
  serverOptions: {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  },
};
console.log(`Server is running on https://${hostname}:${port}`);

const server = serve(serverOptions);

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
