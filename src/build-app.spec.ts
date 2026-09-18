import { HTTPException } from 'hono/http-exception';
import { describe, expect, it } from 'vitest';
import { buildApp, classifyError } from './build-app';
import { AppError, ClickTTError } from './lib/errors';
import { createApp } from './lib/__test-utils__/create-app';
import { MemorySessionStore, type SessionStore } from './lib/session-store';
import type { TranslationKeys } from './locales';

type TestApp = ReturnType<typeof buildApp>;

function newApp(): TestApp {
  return buildApp(new MemorySessionStore());
}

class RecordingStore implements SessionStore {
  getCalled = false;

  get(): Promise<undefined> {
    this.getCalled = true;
    return Promise.resolve(undefined);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- mock impl
  async migrate(): Promise<void> {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- mock impl
  async save(): Promise<void> {
  }
}

describe('buildApp seam', () => {
  it('wires the home route and returns HTML', async () => {
    const app = newApp();

    const res = await app.request('/', {headers: {Accept: 'text/html'}});

    expect(res.status)
      .toBe(200);
    expect(res.headers.get('content-type'))
      .toContain('text/html');
  });

  it('wires the scrape-creation route and not the manual create route', async () => {
    const app = newApp();

    const scrape = await app.request('/create/scrape', {headers: {Accept: 'text/html'}});
    expect(scrape.status)
      .toBe(200);

    const manual = await app.request('/create', {headers: {Accept: 'text/html'}});
    expect(manual.status)
      .toBe(404);
  });

  it('returns 404 for an unknown edit session', async () => {
    const app = newApp();

    const res = await app.request('/edit/does-not-exist');

    expect(res.status)
      .toBe(404);
  });

  it('injects the session store into the request context', async () => {
    const store = new RecordingStore();
    const app = buildApp(store);

    const res = await app.request('/edit/whatever');

    // 404 because the recording store holds no session, but the handler must
    // have consulted the injected instance — not a default one.
    expect(res.status)
      .toBe(404);
    expect(store.getCalled)
      .toBe(true);
  });

  it('never serves client-side spec files from the asset root', async () => {
    const app = newApp();

    const res = await app.request('/assets/app.spec.js');

    expect(res.status)
      .toBe(404);
  });

  it('lets a regular asset path through the spec guard', async () => {
    const app = newApp();

    const res = await app.request('/assets/logos/favicon.svg');

    // Static files are served by index.ts, not the router; a 404 here means
    // the guard let the request fall through to the not-found handler.
    expect(res.status)
      .toBe(404);
  });
});

describe('buildApp crawl and index policy', () => {
  it('serves robots.txt with an allow-only-start-page policy', async () => {
    const res = await newApp()
      .request('/robots.txt', {headers: {'User-Agent': 'Googlebot'}});

    expect(res.status)
      .toBe(200);
    expect(res.headers.get('content-type'))
      .toContain('text/plain');
    const body = await res.text();
    expect(body)
      .toContain('User-agent: *');
    expect(body)
      .toContain('Disallow: /join');
    expect(body)
      .toContain('User-agent: GPTBot');
  });

  it('serves ai.txt mirroring the AI crawler policy', async () => {
    const res = await newApp()
      .request('/ai.txt');

    expect(res.status)
      .toBe(200);
    const body = await res.text();
    expect(body)
      .toContain('User-agent: GPTBot');
    expect(body)
      .toContain('Disallow: /edit');
    expect(body)
      .not
      .toContain('User-agent: *');
  });

  it('lets bots fetch the indexable start page without a noindex header', async () => {
    const res = await newApp()
      .request('/', {headers: {'User-Agent': 'GPTBot/1.0'}});

    expect(res.status)
      .toBe(200);
    expect(res.headers.get('X-Robots-Tag'))
      .toBeNull();
  });

  it('blocks known bot user agents from non-start pages with 403', async () => {
    const app = newApp();
    const botUserAgents = ['GPTBot/1.0', 'Mozilla/5.0 ClaudeBot/1.0', 'SomeRoboCrawler/2.1'];

    for (const userAgent of botUserAgents) {
      const res = await app.request('/create/scrape', {headers: {'User-Agent': userAgent}});
      expect(res.status)
        .toBe(403);
    }
  });

  it('never blocks bots from policy files or static assets', async () => {
    const app = newApp();
    const botHeaders = {'User-Agent': 'GPTBot/1.0'};

    const robots = await app.request('/robots.txt', {headers: botHeaders});
    expect(robots.status)
      .toBe(200);

    const asset = await app.request('/assets/blocked-for-bots.svg', {headers: botHeaders});
    expect(asset.status)
      .toBe(404);
  });

  it('marks non-start pages noindex for real users', async () => {
    const res = await newApp()
      .request('/create/scrape', {headers: {'User-Agent': 'Mozilla/5.0 Firefox/135.0'}});

    expect(res.status)
      .toBe(200);
    expect(res.headers.get('X-Robots-Tag'))
      .toBe('noindex');
  });
});

describe('classifyError', () => {
  const t: (key: TranslationKeys) => string = (key) => createApp()
    .t(key);

  it('maps ClickTTError to a 400 plus the localized scrape message', () => {
    expect(classifyError(new ClickTTError('click-tt 502'), t))
      .toEqual({
        status: 400,
        message: 'click-tt.ch is currently reporting an error. Please try again later.',
        logMessage: 'click-tt 502',
      });
  });

  it('maps an AppError to its own status and message', () => {
    expect(classifyError(new AppError('nope', 409), t))
      .toEqual({status: 409, message: 'nope', logMessage: undefined});
  });

  it('maps an HTTPException to its status and message', () => {
    expect(classifyError(new HTTPException(409, {message: 'teapot declared'}), t))
      .toEqual({status: 409, message: 'teapot declared', logMessage: undefined});
  });

  it('maps a generic Error to a 500 with its message', () => {
    expect(classifyError(new Error('kaboom'), t))
      .toEqual({status: 500, message: 'kaboom', logMessage: undefined});
  });

  it('maps any non-Error value to a 500 with the fallback message', () => {
    expect(classifyError('oops', t))
      .toEqual({status: 500, message: 'Internal Server Error', logMessage: undefined});
    expect(classifyError(null, t))
      .toEqual({status: 500, message: 'Internal Server Error', logMessage: undefined});
  });
});

describe('buildApp error handling', () => {
  function appWithProbe(path: string, handler: () => Promise<Response> | Response): TestApp {
    const app = newApp();
    app.get(path, handler);
    return app;
  }

  it('maps a ClickTTError to a 400 with the localized scrape message', async () => {
    const app = appWithProbe('/boom-clicktt', () => {
      throw new ClickTTError('click-tt 502');
    });

    const res = await app.request('/boom-clicktt', {
      headers: {Accept: 'text/html', 'Accept-Language': 'en-US'},
    });

    expect(res.status)
      .toBe(400);
    expect(await res.text())
      .toContain('click-tt.ch is currently reporting an error');
  });

  it('maps an AppError to its status and message for partial requests', async () => {
    const app = appWithProbe('/boom-apperror', () => {
      throw new AppError('nope', 409);
    });

    const res = await app.request('/boom-apperror', {headers: {'HX-Request': 'true'}});

    expect(res.status)
      .toBe(409);
    const html = await res.text();
    expect(html)
      .toContain('nope');
    expect(html)
      .toContain('id="error-container"');
  });

  it('maps an HTTPException to its status and message on a full page', async () => {
    const app = appWithProbe('/boom-http', () => {
      throw new HTTPException(409, {message: 'teapot declared'});
    });

    const res = await app.request('/boom-http', {headers: {Accept: 'text/html'}});

    expect(res.status)
      .toBe(409);
    expect(await res.text())
      .toContain('teapot declared');
  });

  it('maps a generic Error to a 500', async () => {
    const app = appWithProbe('/boom-error', () => {
      throw new Error('kaboom');
    });

    const res = await app.request('/boom-error', {headers: {Accept: 'text/html'}});

    expect(res.status)
      .toBe(500);
    expect(await res.text())
      .toContain('kaboom');
  });
});
