import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: ContentfulStatusCode = 400,
  )
  {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * programmer errors
 */
export class InternalError extends AppError {
  constructor(
    message = 'Internal Server Error',
  )
  {
    super(message, 500);
    this.name = 'InternalError';
  }
}

/**
 * Hard errors when the application state is invalid (e.g.: url params for session point to a non-existing session)
 */
export class StateError extends AppError {
  constructor(
    message: string,
    status: ContentfulStatusCode = 404,
  )
  {
    super(message, status);
    this.name = 'StateError';
  }
}

/**
 * Errors when an external service (e.g. click-tt.ch) returns a 5xx error.
 */
export class ClickTTError extends AppError {
  constructor(
    message: string,
  )
  {
    super(message, 200);
    this.name = 'ClickTTError';
  }
}

