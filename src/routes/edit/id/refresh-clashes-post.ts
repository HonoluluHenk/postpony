import type { App } from '../../../app';
import { applyClashCheckResult, type ClashCheckResult } from '../../../lib/clashes';
import { computeClashesForSession } from '../../../lib/clash-check';
import { runEditCommand } from './run-edit-command';

export const handleRefreshClashesPost = (app: App): Promise<Response> => {
  let checkResult: ClashCheckResult | undefined;
  let hadSnapshot = false;

  return runEditCommand(app, {
    apply: async (rules, session) => {
      checkResult = await computeClashesForSession(session);
      // Only claim "showing the previous results" when a previous snapshot
      // actually exists; a first check that fails renders the plain nothing state.
      hadSnapshot = session.proposedDates.some((pd) => pd.clashes !== undefined);
      return checkResult === undefined ? session : applyClashCheckResult(session, checkResult);
    },
    message: () => (checkResult === undefined && hadSnapshot ? undefined : app.t('clash_check_refreshed')),
    extras: () => (checkResult === undefined && hadSnapshot ? {refreshError: true} : {}),
  });
};
