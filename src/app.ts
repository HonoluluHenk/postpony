import type { Context } from 'hono';
import { AppFailure } from './app-failure';

export class App {
  constructor(
    readonly isPartial: boolean,
    readonly c: Context,
  )
  {
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

  failure(message: string): never {
    throw new AppFailure(message);
  }
}
