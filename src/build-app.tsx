import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { App } from './app';
import { aiTxt, isBotUserAgent, isCrawlerAllowedPath, robotsTxt } from './lib/crawl-policy';
import { AppError, ClickTTError } from './lib/errors';
import { factory, handleAppRequest } from './lib/hono-factory';
import { logger } from './lib/logger';
import { languageMiddleware } from './lib/middleware/language';
import type { SessionStore } from './lib/session-store';
import type { TranslationKeys } from './locales';
import createRouter from './routes/create/router';
import editRouter from './routes/edit/router';
import { ErrorPage } from './routes/error';
import { handleIndexGet } from './routes/index-get';
import joinRouter from './routes/join/router';
import opponentRouter from './routes/opponent/router';
import { ErrorContainer } from './routes/partials/error-container';

type BuiltApp = ReturnType<typeof factory.createApp>;

export interface ClassifiedError {
  status: ContentfulStatusCode;
  message: string;
  logMessage?: string;
}

/**
 * Maps any thrown value to a response status/message pair. Purely to be able
 * to test the classification itself — the Hono `onError` below only routes the
 * message to the right response shape.
 */
export function classifyError(err: unknown, t: (key: TranslationKeys) => string): ClassifiedError {
  if (err instanceof ClickTTError) {
    return {status: 400, message: t('scrape_error_click_tt'), logMessage: err.message};
  }
  if (err instanceof AppError) {
    return {status: err.status, message: err.message};
  }
  if (err instanceof HTTPException) {
    return {status: err.status, message: err.message};
  }
  if (err instanceof Error) {
    return {status: 500, message: err.message};
  }
  return {status: 500, message: 'Internal Server Error'};
}

export function buildApp(sessionStore: SessionStore): BuiltApp {
  const app = factory.createApp();

  app.use('*', languageMiddleware);
  app.use('*', async (c, next) => {
    c.set('sessionStore', sessionStore);
    await next();
  });
  // ponytail: co-located client-side spec files live under the served asset root
  // but must never be served to visitors. Upgrade: move specs out of src/public.
  app.use('/assets/*', async (c, next) => {
    if (c.req.path.includes('.spec.')) {
      return c.notFound();
    }
    return next();
  });

  function handleRobotsTxt(app: App): Response {
    return app.text(robotsTxt());
  }

  function handleAiTxt(app: App): Response {
    return app.text(aiTxt());
  }

  // Crawl policy: only the start page may be crawled and indexed. The policy
  // text files are advisory (RFC 9309); this filter adds a hard 403 for known
  // bot user agents so agents that ignore robots.txt still get nothing.
  // X-Robots-Tag guards against indexing of disallowed URLs (robots.txt blocks
  // crawling, not indexing).
  app.use('*', async (c, next) => {
    if (!isCrawlerAllowedPath(c.req.path)) {
      c.header('X-Robots-Tag', 'noindex');
      if (isBotUserAgent(c.req.header('user-agent'))) {
        return c.text('Forbidden', 403);
      }
    }
    return next();
  });

  app.get('/', handleAppRequest(handleIndexGet));
  app.get('/robots.txt', handleAppRequest(handleRobotsTxt));
  app.get('/ai.txt', handleAppRequest(handleAiTxt));
  app.route('/create', createRouter);
  app.route('/edit', editRouter);
  app.route('/join', joinRouter);
  app.route('/opponent', opponentRouter);

  app.onError((err, c): Response => {
    const app = App.create(c);
    const {status, message, logMessage} = classifyError(err, (key) => app.t(key));

    if (status >= 500) {
      logger.error({err, status, path: c.req.path}, 'Server error');
    } else {
      logger.warn({status, path: c.req.path, message: logMessage ?? message}, 'Request failed');
    }

    if (app.isPartial) {
      return c.html(app.render(<ErrorContainer globalError={message} isOob={true}/>), {status});
    }

    return c.html(app.render(<ErrorPage {...app.view} message={message} globalError={message}/>), {status});
  });

  return app;
}
