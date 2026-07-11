import type { Context } from 'hono';
import { createFactory } from 'hono/factory';
import { App } from '../app';
import type { Locale } from '../locales';

export interface HonoEnv {
  Variables: {
    locale: Locale;
  };
}

export const factory = createFactory<HonoEnv>();

export function handleAppRequest(handler: (app: App) => Response | Promise<Response>) {
  return async (c: Context): Promise<Response> => {
    return handler(App.create(c));
  };
}
