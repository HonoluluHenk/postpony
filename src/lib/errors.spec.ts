import { describe, expect, it } from 'vitest';
import { AppError, ClickTTError, InternalError, StateError } from './errors';

describe('AppError', () => {
  it('uses the default 400 status and names itself', () => {
    const err = new AppError('bad request');
    expect(err.message).toBe('bad request');
    expect(err.status).toBe(400);
    expect(err.name).toBe('AppError');
    expect(err).toBeInstanceOf(Error);
  });

  it('honours an explicit status', () => {
    const err = new AppError('custom', 422);
    expect(err.status).toBe(422);
  });
});

describe('InternalError', () => {
  it('defaults the message to "Internal Server Error" and pins the 500 status', () => {
    const err = new InternalError();
    expect(err.message).toBe('Internal Server Error');
    expect(err.status).toBe(500);
    expect(err.name).toBe('InternalError');
  });

  it('keeps a custom message', () => {
    expect(new InternalError('boom').message).toBe('boom');
  });
});

describe('StateError', () => {
  it('uses the default 404 status', () => {
    const err = new StateError('not found');
    expect(err.status).toBe(404);
    expect(err.name).toBe('StateError');
  });

  it('honours an explicit status', () => {
    expect(new StateError('gone', 410).status).toBe(410);
  });
});

describe('ClickTTError', () => {
  it('carries the message and its own name', () => {
    const err = new ClickTTError('scrape failed');
    expect(err.message).toBe('scrape failed');
    expect(err.status).toBe(200);
    expect(err.name).toBe('ClickTTError');
  });

  it('is an AppError', () => {
    expect(new ClickTTError('x')).toBeInstanceOf(AppError);
  });
});