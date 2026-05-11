import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class AppError extends Error {
  constructor(message: string, public readonly status: ContentfulStatusCode = 400) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * programmer errors
 */
export class InternalError extends AppError {
  constructor(message: string = 'Internal Server Error') {
    super(message, 500);
    this.name = 'InternalError';
  }
}

/**
 * Hard errors when the application state is invalid (e.g.: url params for session point to a non-existing session)
 */
export class StateError extends AppError {
  constructor(message: string, status: ContentfulStatusCode = 404) {
    super(message, status);
    this.name = 'StateError';
  }
}

/**
 * Input validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}
