import { describe, expect, it } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  it('exposes info/warn/error that do not throw', () => {
    expect(() => {
      logger.info({a: 1}, 'hi');
    }).not.toThrow();
    expect(() => {
      logger.warn({a: 1}, 'hi');
    }).not.toThrow();
    expect(() => {
      logger.error({a: 1}, 'hi');
    }).not.toThrow();
  });
});
