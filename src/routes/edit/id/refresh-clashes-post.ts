import type { App } from '../../../app';
import { applyClashCheckResult } from '../../../lib/clashes';
import { computeClashesForSession, type ClashCheckOutcome } from '../../../lib/clash-check';
import { runEditCommand } from './run-edit-command';

export const handleRefreshClashesPost = (app: App): Promise<Response> => {
  let outcome: ClashCheckOutcome = {state: 'unchanged'};
  let hadSnapshot = false;

  return runEditCommand(app, {
    apply: async (rules, session) => {
      outcome = await computeClashesForSession(session);
      // Only claim "showing the previous results" when a previous snapshot
      // actually exists; a first check that fails renders the plain nothing state.
      hadSnapshot = session.proposedDates.some((pd) => pd.clashes !== undefined);
      if (outcome.state === 'ok') {
        return {...applyClashCheckResult(session, outcome.result), clashDataStale: undefined};
      }
      if (outcome.state === 'transient-failure') {
        return {...session, clashDataStale: true};
      }
      return session;
    },
    message: () => (outcome.state !== 'ok' && hadSnapshot ? undefined : app.t('clash_check_refreshed')),
    extras: () => (outcome.state !== 'ok' && hadSnapshot ? {refreshError: true} : {}),
  });
};
