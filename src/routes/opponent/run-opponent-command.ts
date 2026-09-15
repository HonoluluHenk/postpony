import type { App } from '../../app';
import type { Postponement } from '../../lib/models';
import { PostponementRules } from '../../lib/postponement';
import { opponentPasswordFromRequest, requireOpponentCaptain } from './opponent-utils';
import { renderOpponent } from './render-opponent';
import type { OpponentPageProps } from './opponent';

/** A value computed up front, or derived from the session the command saved. */
type Derived<T> = T | ((updated: Postponement) => T);

export interface OpponentCommand {
  /**
   * The one rule operation for this mutation. Returning a `Response` is the
   * escape hatch for branches the pipeline must not touch (validation 400s).
   */
  apply: (
    rules: PostponementRules,
    session: Postponement,
  ) => Promise<Postponement | Response> | Postponement | Response;
  /** Polite outcome announcement; a function sees the updated session. */
  message?: Derived<string | undefined>;
  /** Extra fields for the re-rendered page/partial. */
  extras?: Derived<Partial<Pick<OpponentPageProps, 'playerName' | 'playerError'>>>;
  /** Override for the non-partial redirect target. */
  redirectTo?: string;
  /** Render even without an HTMX request (the veto/acceptable toggles). */
  alwaysRender?: boolean;
}

function resolveDerived<T>(value: Derived<T> | undefined, updated: Postponement): T | undefined {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === 'function' ? (value as (updated: Postponement) => T)(updated) : value;
}

/**
 * The single opponent-POST pipeline: load the Postponement, guard the missing session,
 * verify the opponent-captain password, run one rule operation, save only when it
 * changed, then render the HTMX partial or redirect to the opponent page.
 */
export async function runOpponentCommand(app: App, command: OpponentCommand): Promise<Response> {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }
  await requireOpponentCaptain(app, session);

  const updated = await command.apply(new PostponementRules(), session);
  if (updated instanceof Response) {
    return updated;
  }
  if (updated !== session) {
    await app.store.save(updated);
  }

  if (app.isPartial || command.alwaysRender === true) {
    const message = resolveDerived(command.message, updated);
    const extras = resolveDerived(command.extras, updated) ?? {};
    return app.html(renderOpponent(app, updated, {
      ...extras,
      ...(message === undefined ? {} : {statusMessage: message}),
    }));
  }

  return app.redirect(
    command.redirectTo ?? `/opponent/${id}?opponentCaptainPassword=${opponentPasswordFromRequest(app)}`,
  );
}
