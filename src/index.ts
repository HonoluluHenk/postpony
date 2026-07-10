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
import { AppError, ClickTTError } from './lib/errors';
import { languageMiddleware } from './lib/middleware/language';
import { handleCreateGet } from './routes/create/create-get';
import { handleCreatePost } from './routes/create/create-post';
import { handleScrapeGroupsGet } from './routes/create/scrape/groups-get';
import { handleScrapeLeaguesGet } from './routes/create/scrape/leagues-get';
import { handleScrapeMeetingPost } from './routes/create/scrape/meeting-post';
import { handleScrapeMeetingsGet } from './routes/create/scrape/meetings-get';
import { handleScrapeTeamsGet } from './routes/create/scrape/teams-get';
import { handleEditGet } from './routes/edit/id/edit-id-get';
import { handleEditPlayersPost } from './routes/edit/id/players-post';
import { handleEditVenuePost } from './routes/edit/id/venue-post';
import { handleIndexGet } from './routes/index-get';

const app = new Hono();

// Resolve absolute paths to avoid CWD differences between dev and test runners
const publicDir = path.resolve(process.cwd(), 'src/public');

app.use('/assets/*', serveStatic({root: publicDir}));

app.use('*', languageMiddleware);

app.get('/', handleAppRequest(handleIndexGet));
app.get('/create', handleAppRequest(handleCreateGet));
app.post('/create', handleAppRequest(handleCreatePost));
app.get('/create/scrape', handleAppRequest(handleScrapeLeaguesGet));
app.get('/create/scrape/groups', handleAppRequest(handleScrapeGroupsGet));
app.get('/create/scrape/teams', handleAppRequest(handleScrapeTeamsGet));
app.get('/create/scrape/meetings', handleAppRequest(handleScrapeMeetingsGet));
app.post('/create/scrape/meeting', handleAppRequest(handleScrapeMeetingPost));
app.post('/edit/:id/venue', handleAppRequest(handleEditVenuePost));
app.post('/edit/:id/players', handleAppRequest(handleEditPlayersPost));
app.get('/edit/:id', handleAppRequest(handleEditGet));
app.get('/foo', handleAppRequest((app: App): Response => app.c.text('Hello from foo')));

app.onError((err, c): Response => {
  const app = App.create(c);
  let status: ContentfulStatusCode;
  let message: string;
  let logMessage: string | undefined;

  if (err instanceof ClickTTError) {
    status = 200;
    message = app.t('scrape_error_click_tt');
    logMessage = err.message;
  } else if (err instanceof AppError) {
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

  // Expected client errors (4xx, e.g. a request for a non-existent session) are
  // part of normal operation; log them concisely without a stack trace so the
  // (test) output stays readable. Only unexpected/server errors are logged in full.
  if (status >= 500) {
    console.error('Error occurred:', err);
  } else {
    console.warn(`Request failed (${status}): ${logMessage ?? message}`);
  }

  if (app.isPartial) {
    return c.html(`
      <div id="error-container" hx-swap-oob="true">
        <section class="error padding white-text" role="alert">
          <i>error</i>
          <div class="max">
            <p>${message}</p>
          </div>
        </section>
      </div>`, {status});
  }

  return c.html(app.render('error.eta', {title: 'Error', message, globalError: message}), {status});
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
  return async (c: Context): Promise<Response> => {
    return handler(App.create(c));
  };
}
