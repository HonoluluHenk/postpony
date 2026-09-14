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

export const consoleLogger: AppLogger = {
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

/**
 * Builds the pino-backed logger for a Node runtime. Exported so the debug/info
 * and transport selection can be unit-tested without waiting for the dynamic
 * `pino` import to resolve.
 */
export function buildPinoLogger(pinoModule: { default: typeof Pino }): AppLogger {
  const pino = pinoModule.default;
  const isDev = config.get('env') === 'development';
  return pino({
    level: isDev ? 'debug' : 'info',
    transport: isDev
      ? {target: 'pino/file', options: {destination: 1}}
      : undefined,
  });
}

const isNode = typeof process !== 'undefined' && !!process.versions.node;

let current: AppLogger = consoleLogger;

/**
 * Replaces the active logger backend. Kept as an explicit seam so runtimes can
 * install their own transport (and tests can verify delegation deterministically
 * instead of racing the async pino import).
 */
export function installLogger(loggerImpl: AppLogger): void {
  current = loggerImpl;
}

if (isNode) {
  const pinoModule = 'pino';
  void import(pinoModule).then((m) => {
    current = buildPinoLogger(m as { default: typeof Pino });
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