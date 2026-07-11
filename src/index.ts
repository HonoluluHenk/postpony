import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import * as fs from 'fs';
import { HTTPException } from 'hono/http-exception';

import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { createServer as createHttpsServer } from 'node:https';
import path from 'path';
import { App } from './app';
import config from './config';
import { AppError, ClickTTError } from './lib/errors';
import { factory, handleAppRequest } from './lib/hono-factory';
import { languageMiddleware } from './lib/middleware/language';
import createRouter from './routes/create/router';
import editRouter from './routes/edit/router';
import { handleIndexGet } from './routes/index-get';

const app = factory.createApp();

// Resolve absolute paths to avoid CWD differences between dev and test runners
const publicDir = path.resolve(process.cwd(), 'src/public');

app.use('/assets/*', serveStatic({root: publicDir}));

app.use('*', languageMiddleware);

app.get('/', handleAppRequest(handleIndexGet));
app.route('/create', createRouter);
app.route('/edit', editRouter);

// ponytail: test endpoint; remove before production if not needed.
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


