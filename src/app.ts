import { Eta } from 'eta';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import path from 'node:path';
import { AppError, InternalError, StateError, ValidationError } from './lib/errors';
import type { RescheduleSession } from './lib/models';

export const eta = new Eta({views: path.join(process.cwd(), 'src/views')});

export class App {
  constructor(
    readonly isPartial: boolean,
    readonly c: Context,
  )
  {
  }

  private static readonly sessions: Record<string, RescheduleSession> = {};

  readonly sessions: Record<string, RescheduleSession> = App.sessions;

  render(template: string, data: object): string {
    return eta.render(template, data);
  }

  requireParam(name: string): string;
  requireParam<P>(name: string, transform: (value: string) => P): P;
  requireParam<P>(name: string, transform?: (value: string) => P): P {
    const value = this.c.req.param(name);
    if (value === undefined) {
      this.failure(`Missing required parameter: ${name}`);
    }

    if (!transform) {
      return value as P;
    }

    return transform(value);
  }

  validation(message: string): never {
    throw new ValidationError(message);
  }

  notFound(message: string = 'Not Found'): never {
    throw new StateError(message, 404);
  }

  internal(message: string = 'Internal Server Error'): never {
    throw new InternalError(message);
  }

  failure(message: string, status: ContentfulStatusCode = 400): never {
    throw new AppError(message, status);
  }
}
