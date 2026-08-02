import type { Context } from 'hono';
import { createFactory } from 'hono/factory';
import { App } from '../app';
import type { AppLocale } from '../locales';
import type { SessionStore } from './session-store';

export interface HonoEnv {
  Variables: {
    locale: AppLocale;
    sessionStore: SessionStore;
  };
}

export const factory = createFactory<HonoEnv>();

export function handleAppRequest(handler: (app: App) => Response | Promise<Response>) {
  return async (c: Context): Promise<Response> => {
    const store = c.get('sessionStore') as SessionStore | undefined;
    return handler(App.create(c, store));
  };
}
