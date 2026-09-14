import type { Context } from 'hono';
import { App } from '../../app';
import { type AppLocale, LOCALE_KEY } from '../../locales';
import { MemorySessionStore } from '../session-store';

export interface MockOptions {
  params?: Record<string, string>;
  queries?: Record<string, string>;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  locale?: AppLocale;
  url?: string;
}

const DEFAULT_URL = 'https://game-scheduler.localhost:3000/';

/**
 * The one context fake every route spec builds its `App` over. Backed by a
 * `MemorySessionStore` and a minimal Hono context (params, queries, request
 * headers, parsed body, response html/redirect/text/header). The default
 * `en-US` keeps `app.t(...)` returning the real English strings the specs
 * assert on.
 */
export function createApp(options: MockOptions = {}): App {
  const {
    params = {},
    queries = {},
    headers = {},
    body = {},
    locale = 'en-US',
    url = DEFAULT_URL,
  } = options;
  const store = new MemorySessionStore();
  const responseHeaders: Record<string, string> = {};
  const context = {
    get: (key: string): string | undefined => (key === LOCALE_KEY ? locale : undefined),
    req: {
      param: (name: string): string | undefined => params[name],
      query: (name: string): string | undefined => queries[name],
      header: (name: string): string | undefined => headers[name],
      parseBody: (): Promise<Record<string, unknown>> => Promise.resolve(body),
      url,
    },
    html: (content: string, init?: ResponseInit): Response => {
      const headers = new Headers(init?.headers);
      for (const [name, value] of Object.entries(responseHeaders)) {
        headers.set(name, value);
      }
      return new Response(content, {...init, headers});
    },
    redirect: (location: string): Response => new Response(null, {status: 302, headers: {Location: location}}),
    text: (content: string, status = 200): Response => new Response(content, {status, headers: responseHeaders}),
    header: (name: string, value: string): void => {
      responseHeaders[name] = value;
    },
  } as unknown as Context;

  return App.create(context, store);
}
