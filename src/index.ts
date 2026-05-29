import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import * as fs from 'fs';
import { type Context, Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { createServer as createHttpsServer } from 'node:https';
import path from 'path';
import { App } from './app';
import config from './config';
import { AppError } from './lib/errors';
import { languageMiddleware } from './lib/middleware/language';
import { handleCreateGet } from './routes/create/create-get';
import { handleCreatePost } from './routes/create/create-post';
import { handleScrapeClubsGet } from './routes/create/scrape/clubs-get';
import { handleScrapeMeetingPost } from './routes/create/scrape/meeting-post';
import { handleScrapeMeetingsGet } from './routes/create/scrape/meetings-get';
import { handleScrapeRegionsGet } from './routes/create/scrape/regions-get';
import { handleScrapeTeamsGet } from './routes/create/scrape/teams-get';
import { handleEditGet } from './routes/edit/id/edit-id-get';
import { handleEditPlayersPost } from './routes/edit/id/players-post';
import { handleEditVenuePost } from './routes/edit/id/venue-post';
import { handleIndexGet } from './routes/index-get';

const app = new Hono();

app.use('/favicon.svg', serveStatic({path: './src/public/favicon.svg'}));
app.use('/css/*', serveStatic({root: './src/public'}));
app.use('/js/*', serveStatic({root: './src/public'}));
app.use('/vendor/*', serveStatic({root: './src/public'}));

app.use('*', languageMiddleware);

app.get('/', handleAppRequest(handleIndexGet));
app.get('/create', handleAppRequest(handleCreateGet));
app.post('/create', handleAppRequest(handleCreatePost));
app.get('/create/scrape', handleAppRequest(handleScrapeRegionsGet));
app.get('/create/scrape/clubs', handleAppRequest(handleScrapeClubsGet));
app.get('/create/scrape/teams', handleAppRequest(handleScrapeTeamsGet));
app.get('/create/scrape/meetings', handleAppRequest(handleScrapeMeetingsGet));
app.post('/create/scrape/meeting', handleAppRequest(handleScrapeMeetingPost));
app.post('/edit/:id/venue', handleAppRequest(handleEditVenuePost));
app.post('/edit/:id/players', handleAppRequest(handleEditPlayersPost));
app.get('/edit/:id', handleAppRequest(handleEditGet));
app.get('/foo', handleAppRequest((app: App): Response => app.c.text('Hello from foo')));

app.onError(async (err, c) => {
  console.error('Error occurred:', err);

  let status: ContentfulStatusCode;
  let message: string;

  if (err instanceof AppError) {
    status = err.status;
    message = err.message;
  } else if (err instanceof HTTPException) {
    status = err.status;
    message = err.message;
  } else if (err instanceof Error) {
    status = 500;
    message = err.message;
  } else {
    status = 500;
    message = 'Internal Server Error';
  }

  if (c.req.header('HX-Request')) {
    return c.html(`
      <aside class="toast error white-text top" role="alert">
        <i>error</i>
        <div class="max">${message}</div>
      </aside>`, {status});
  }

  const appInstance = new App(false, c);
  return c.html(appInstance.render('error.eta', {title: 'Error', message}), {status});
});

const port = config.get('port');
const hostname = config.get('hostname');

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


function handleAppRequest(handler: (app: App) => Response | Promise<Response>) {
  return async (c: Context) => {
    return await handler(new App(
      !!c.req.header('HX-Request'),
      c,
    ));
  };
}
