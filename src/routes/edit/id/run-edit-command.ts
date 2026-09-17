import type { App } from '../../../app';
import type { Postponement } from '../../../lib/models';
import { PostponementRules } from '../../../lib/postponement';
import { requireOrganizerCaptain } from './edit-auth';
import { type EditPartialExtras, renderEditPartials } from './render-edit-partials';

/** A value computed up front, or derived from the session the command saved. */
type Derived<T> = T | ((updated: Postponement) => T);

export interface EditCommand {
  /**
   * The one rule operation for this mutation. Returning a `Response` is the
   * escape hatch for branches the pipeline must not touch (validation 400s and
   * no-save renders); those responses are returned verbatim.
   */
  apply: (
    rules: PostponementRules,
    session: Postponement,
  ) => Promise<Postponement | Response> | Postponement | Response;
  /** Polite outcome announcement; a function sees the updated session. */
  message?: Derived<string | undefined>;
  /** Extra fields for the re-rendered page/partial. */
  extras?: Derived<EditPartialExtras>;
  /** Override for the non-partial redirect target. */
  redirectTo?: string;
  /**
   * Render even without an HTMX request. The visibility toggle is the only edit
   * POST that answers a plain request with the full page rather than a redirect.
   */
  alwaysRender?: boolean;
}

function resolveDerived<T>(value: Derived<T> | undefined, updated: Postponement): T | undefined {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === 'function' ? (value as (updated: Postponement) => T)(updated) : value;
}

/**
 * The single edit-POST pipeline: load the Postponement, guard the missing
 * session, run one rule operation, save only when it changed, then render the
 * HTMX partial or redirect to the edit page. Handlers declare only what
 * differs — their operation, outcome message, render extras, and redirect
 * target — so the seven edit mutations cannot drift apart.
 */
export async function runEditCommand(app: App, command: EditCommand): Promise<Response> {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }
  await requireOrganizerCaptain(app, session);

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
    return app.html(renderEditPartials(app, updated, {
      ...extras,
      ...(message === undefined ? {} : {statusMessage: message}),
      // Only status changes alter the workflow instructions; shipping them on
      // every swap would pop a collapsed block open again.
      renderWorkflowInstructions: session.status !== updated.status,
    }));
  }

  return app.redirect(
    command.redirectTo ?? `/edit/${id}?organizerPassword=${app.query('organizerPassword') ?? ''}`,
  );
}
