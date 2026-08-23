import config from '../config';
import type { pino as Pino } from 'pino';

// ponytail: pino pulls in node:stream, so it must never be statically imported
// into the Cloudflare Worker bundle. Under Node we load it dynamically via a
// non-literal specifier (esbuild leaves it as a runtime import and the Worker
// never executes this branch). A console-based logger backs the export until
// pino resolves, and remains the only logger on Workers.
export interface AppLogger {
  info(obj: unknown, msg?: string): void;
  warn(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
}

const consoleLogger: AppLogger = {
  info: (obj, msg) => {
    console.log(obj ?? '', msg ?? '');
  },
  warn: (obj, msg) => {
    console.warn(obj ?? '', msg ?? '');
  },
  error: (obj, msg) => {
    console.error(obj ?? '', msg ?? '');
  },
};

const isNode = typeof process !== 'undefined' && !!process.versions.node;

let current: AppLogger = consoleLogger;

if (isNode) {
  const pinoModule = 'pino';
  void import(pinoModule).then((m) => {
    const pino = (m as unknown as { default: typeof Pino }).default;
    const isDev = config.get('env') === 'development';
    current = pino({
      level: isDev ? 'debug' : 'info',
      transport: isDev
        ? {target: 'pino/file', options: {destination: 1}}
        : undefined,
    });
  });
}

export const logger: AppLogger = {
  info: (obj, msg) => {
    current.info(obj, msg);
  },
  warn: (obj, msg) => {
    current.warn(obj, msg);
  },
  error: (obj, msg) => {
    current.error(obj, msg);
  },
};
