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
import { logger } from './lib/logger';
import { languageMiddleware } from './lib/middleware/language';
import createRouter from './routes/create/router';
import editRouter from './routes/edit/router';
import { handleIndexGet } from './routes/index-get';
import joinRouter from './routes/join/router';

const app = factory.createApp();

// Resolve absolute paths to avoid CWD differences between dev and test runners
const publicDir = path.resolve(process.cwd(), 'src/public');

app.use('/assets/*', serveStatic({root: publicDir}));

app.use('*', languageMiddleware);

app.get('/', handleAppRequest(handleIndexGet));
app.route('/create', createRouter);
app.route('/edit', editRouter);
app.route('/join', joinRouter);

app.onError((err, c): Response => {
  const app = App.create(c);
  let status: ContentfulStatusCode;
  let message: string;
  let logMessage: string | undefined;

  if (err instanceof ClickTTError) {
    status = 400;
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

  if (status >= 500) {
    logger.error({err, status, path: c.req.path}, 'Server error');
  } else {
    logger.warn({status, path: c.req.path, message: logMessage ?? message}, 'Request failed');
  }

  if (app.isPartial) {
    return c.html(app.render('partials/error-container.eta', {globalError: message}), {status});
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

// keep this console.log because the URL can be clicked int the IDE :)
console.log(`Server is running on https://${hostname}:${port}`);
logger.info({hostname, port}, 'Server started');

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

