import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPinoLogger, consoleLogger, installLogger, logger } from './logger';

// The config mock keeps the env switchable per test so buildPinoLogger can be
// exercised in development and production without touching the real config.
const state = vi.hoisted(() => ({env: 'production'}));

vi.mock('../config', () => ({
  default: {get: (key: string): string | undefined => key === 'env' ? state.env : undefined},
}));

afterEach(() => {
  state.env = 'production';
  vi.restoreAllMocks();
});

describe('consoleLogger', () => {
  it('logs objects and messages via console', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    consoleLogger.info({a: 1}, 'info-msg');
    consoleLogger.warn({b: 2}, 'warn-msg');
    consoleLogger.error({c: 3}, 'error-msg');

    expect(log).toHaveBeenCalledWith({a: 1}, 'info-msg');
    expect(warn).toHaveBeenCalledWith({b: 2}, 'warn-msg');
    expect(error).toHaveBeenCalledWith({c: 3}, 'error-msg');
  });

  it('falls back to empty strings when no object or message is given', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    consoleLogger.info(undefined, undefined);
    consoleLogger.warn(undefined, undefined);
    consoleLogger.error(undefined, undefined);

    expect(log).toHaveBeenCalledWith('', '');
    expect(warn).toHaveBeenCalledWith('', '');
    expect(error).toHaveBeenCalledWith('', '');
  });
});

describe('buildPinoLogger', () => {
  it('configures debug level and a file transport in development', () => {
    const instance = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
    const pino = vi.fn(() => instance);
    state.env = 'development';

    const built = buildPinoLogger({default: pino as never});

    expect(pino).toHaveBeenCalledWith(expect.objectContaining({
      level: 'debug',
      transport: {target: 'pino/file', options: {destination: 1}},
    }));
    expect(built).toBe(instance);
  });

  it('configures info level without a transport outside development', () => {
    const instance = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
    const pino = vi.fn(() => instance);
    state.env = 'production';

    const built = buildPinoLogger({default: pino as never});

    expect(pino).toHaveBeenCalledWith({
      level: 'info',
      transport: undefined,
    });
    expect(built).toBe(instance);
  });
});

describe('logger', () => {
  it('delegates info/warn/error to the installed logger', () => {
    const backend = {info: vi.fn(), warn: vi.fn(), error: vi.fn()};
    installLogger(backend);

    logger.info({a: 1}, 'hi');
    logger.warn({a: 1}, 'warn');
    logger.error({a: 1}, 'err');

    expect(backend.info).toHaveBeenCalledWith({a: 1}, 'hi');
    expect(backend.warn).toHaveBeenCalledWith({a: 1}, 'warn');
    expect(backend.error).toHaveBeenCalledWith({a: 1}, 'err');
  });

  it('uses the console logger until pino resolves', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    installLogger(consoleLogger);

    logger.info('just-a-string');

    expect(log).toHaveBeenCalledWith('just-a-string', '');
  });
});