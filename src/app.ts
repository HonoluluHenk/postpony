import { Eta } from 'eta';
import type { Context } from 'hono';
import path from 'node:path';
import { AppFailure } from './app-failure';
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

  failure(message: string): never {
    throw new AppFailure(message);
  }
}
