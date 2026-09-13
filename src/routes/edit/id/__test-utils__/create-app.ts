import type { Context } from 'hono';
import { vi } from 'vitest';
import { App } from '../../../../app';
import { LOCALE_KEY } from '../../../../locales';
import { MemorySessionStore } from '../../../../lib/session-store';

export interface MockOptions {
  params?: Record<string, string>;
  queries?: Record<string, string>;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

/**
 * Builds an `App` over a `MemorySessionStore` and a minimal Hono context fake
 * (params, queries, headers, body, html, redirect). `en-US` keeps `app.t(...)`
 * returning the real English strings the specs assert on.
 */
export function createApp(options: MockOptions = {}): App {
  const {params = {}, queries = {}, headers = {}, body = {}} = options;
  const store = new MemorySessionStore();
  const context = {
    get: (key: string): string | undefined => (key === LOCALE_KEY ? 'en-US' : undefined),
    req: {
      param: (name: string): string | undefined => params[name],
      query: (name: string): string | undefined => queries[name],
      header: (name: string): string | undefined => headers[name],
      parseBody: (): Promise<Record<string, unknown>> => Promise.resolve(body),
      url: 'https://game-scheduler.localhost:3000/',
    },
    html: vi.fn((content: string, init?: ResponseInit) => new Response(content, init)),
    redirect: vi.fn((url: string) => new Response(null, {status: 302, headers: {Location: url}})),
  } as unknown as Context;

  return App.create(context, store);
}
