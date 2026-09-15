import type { App } from '../../app';
import { comparePassword } from '../../lib/crypto-utils';
import type { Postponement, Team } from '../../lib/models';

/** The opponent captain sits on the side opposite the organizer's `organizerTeam`. */
export function opponentTeam(session: Postponement): Team {
  return session.organizerTeam === 'home' ? 'away' : 'home';
}

/** Appends the opponent-captain password to a request URL, preserving any existing query. */
export function withOpponentPassword(url: string, password: string | undefined): string {
  if (!password) {
    return url;
  }
  return `${url}${url.includes('?') ? '&' : '?'}opponentCaptainPassword=${password}`;
}

/**
 * The opponent-captain password travels as `?opponentCaptainPassword=`. Partial HTMX
 * requests post to URLs without it, so the password is recovered from the browser URL
 * that HTMX forwards as `HX-Current-URL`.
 */
export function opponentPasswordFromRequest(app: App): string {
  const query = app.query('opponentCaptainPassword');
  if (query !== undefined) {
    return query;
  }
  try {
    return new URL(app.currentUrl()).searchParams.get('opponentCaptainPassword') ?? '';
  } catch {
    return '';
  }
}

/** Opponent-captain access requires the opponent-captain password; missing/wrong is a 403. */
export async function requireOpponentCaptain(app: App, session: Postponement): Promise<void> {
  if (!await comparePassword(opponentPasswordFromRequest(app), session.opponentCaptainPasswordHash)) {
    app.failure(app.t('invalid_opponent_captain_password'), 403);
  }
}
