import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Eta } from 'eta';
import * as fs from 'fs';
import { Hono } from 'hono';

import { createServer as createHttpsServer } from 'node:https';
import * as path from 'path';
import { generateId, generateRandomPassword, hashPassword } from './lib/crypto-utils';
import { RescheduleSession } from './lib/models';

const app = new Hono();
const eta = new Eta({views: path.join(process.cwd(), 'src/views')});

// In-memory store for MVP (will be replaced by Firestore)
const sessions: Record<string, RescheduleSession> = {};

app.use('/favicon.svg', serveStatic({path: './src/public/favicon.svg'}));
app.use('/css/*', serveStatic({root: './src/public'}));
app.use('/js/*', serveStatic({root: './src/public'}));

app.get('/', (c) => {
  const isPartial = !!c.req.header('HX-Request');
  const html = eta.render('index.eta', {title: 'Game Re-scheduler', isPartial});
  return c.html(html);
});

app.get('/create', (c) => {
  const isPartial = !!c.req.header('HX-Request');
  const html = eta.render('create.eta', {title: 'Create a new ReSchedule', isPartial});
  return c.html(html);
});

app.post('/create', async (c) => {
  const body = await c.req.parseBody();
  const name = body['name'] as string;

  if (!name) {
    return c.text('Name is required', 400);
  }

  const id = generateId();
  const ownerPassword = generateRandomPassword();
  const invitationPassword = generateRandomPassword();

  const session: RescheduleSession = {
    id,
    clubId: 'default-club', // Placeholder for MVP
    name,
    ownerPasswordHash: hashPassword(ownerPassword),
    invitationPasswordHash: hashPassword(invitationPassword),
    status: 'Draft',
    createdAt: new Date().toISOString(),
  };

  sessions[id] = session;

  const isPartial = !!c.req.header('HX-Request');
  const data = {
    title: `Editing ${name}`,
    session,
    ownerPassword,
    isPartial,
  };

  const html = eta.render('edit.eta', data);
  return c.html(html);
});

app.get('/edit', (c) => {
  const isPartial = !!c.req.header('HX-Request');
  const html = eta.render('edit.eta', {
    title: 'Edit Existing ReSchedule',
    session: {name: 'Placeholder', status: 'Draft', id: '123'},
    ownerPassword: null,
    isPartial,
  });
  return c.html(html);
});

const port = parseInt(process.env['PORT'] ?? '3000', 10);
const hostname = process.env['HOSTNAME'] ?? 'game-scheduler.localhost';

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
