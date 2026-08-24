import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { App } from './app';
import { AppError, ClickTTError } from './lib/errors';
import { factory, handleAppRequest } from './lib/hono-factory';
import { logger } from './lib/logger';
import { languageMiddleware } from './lib/middleware/language';
import type { SessionStore } from './lib/session-store';
import createRouter from './routes/create/router';
import editRouter from './routes/edit/router';
import { ErrorPage } from './routes/error';
import { handleIndexGet } from './routes/index-get';
import joinRouter from './routes/join/router';
import { ErrorContainer } from './routes/partials/error-container';

type BuiltApp = ReturnType<typeof factory.createApp>;

export function buildApp(sessionStore: SessionStore): BuiltApp {
  const app = factory.createApp();

  app.use('*', languageMiddleware);
  app.use('*', async (c, next) => {
    c.set('sessionStore', sessionStore);
    await next();
  });

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
      return c.html(app.render(<ErrorContainer globalError={message} isOob={true} />), {status});
    }

    return c.html(app.render(<ErrorPage {...app.view} message={message} globalError={message} />), {status});
  });

  return app;
}
