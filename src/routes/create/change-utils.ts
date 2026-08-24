import type { App } from '../../app';
import { comparePassword } from '../../lib/crypto-utils';
import type { Postponement } from '../../lib/models';

/**
 * The query suffix wizard links append to thread change-mode context
 * (`sessionId` + `ownerPassword`) through the drill-down steps. Empty for
 * mint mode. Assumes the leading `&` so it can be appended to existing
 * query strings.
 */
export function changeQuerySuffix(
  sessionId: string | undefined,
  ownerPassword: string | undefined,
): string {
  return sessionId && ownerPassword
    ? `&sessionId=${encodeURIComponent(sessionId)}&ownerPassword=${encodeURIComponent(ownerPassword)}`
    : '';
}

/**
 * The change-mode context the scrape wizard step views share: mint mode when
 * `changeMode` is false, otherwise the threaded `sessionId`/`ownerPassword`
 * plus the pre-encoded query suffix for the drill-down links.
 */
export interface WizardChangeMode {
  changeMode: boolean;
  changeSuffix: string;
  sessionId?: string;
  ownerPassword?: string;
}

/**
 * Loads the session a change-mode request targets and verifies the owner
 * password before anything is mutated. Throws (via `app.failure`/`app.notFound`)
 * when the session is missing or the password does not match.
 */
export async function requireChangeSession(
  app: App,
  sessionId: string | undefined,
  ownerPassword: string | undefined,
): Promise<Postponement> {
  if (!sessionId) {
    app.failure(app.t('missing_param', {name: 'sessionId'}), 400);
  }
  if (!ownerPassword) {
    app.failure(app.t('invalid_owner_password'), 403);
  }
  const session = await app.store.get(sessionId);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }
  if (!await comparePassword(ownerPassword, session.ownerPasswordHash)) {
    app.failure(app.t('invalid_owner_password'), 403);
  }
  return session;
}
