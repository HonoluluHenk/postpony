import type { App } from '../../../app';
import type { Postponement } from '../../../lib/models';
import { runEditCommand } from './run-edit-command';

/**
 * Whether the date the session is confirmed on carries a Clash. Judged from
 * `confirmedProposedDateId` (the locked history), not the submitted query, so a
 * stale parameter never changes the announcement.
 */
function confirmedDateHasClashes(session: Postponement): boolean {
  const confirmedDate = session.proposedDates.find((pd) => pd.id === session.confirmedProposedDateId);
  const clashes = confirmedDate?.clashes;
  return clashes !== undefined && (clashes.home.length > 0 || clashes.away.length > 0);
}

export const handleConfirmDatePost = (app: App): Promise<Response> => {
  const proposedDateId = app.query('proposedDateId') ?? '';

  return runEditCommand(app, {
    apply: (rules, session) => rules.confirmDate(session, proposedDateId),
    // One polite announcement per action: a clash on the confirmed date is the
    // outcome worth announcing, so it replaces the plain confirmation.
    message: (updated) => (confirmedDateHasClashes(updated)
      ? app.t('clash_check_confirm_warning')
      : app.t('date_confirmed')),
    extras: (updated) => (confirmedDateHasClashes(updated) ? {confirmClashWarning: true} : {}),
  });
};
