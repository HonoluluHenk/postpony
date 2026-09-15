import type { App } from '../../../app';
import { comparePassword } from '../../../lib/crypto-utils';
import type { Postponement } from '../../../lib/models';

/** Appends the organizer password to a request URL, preserving any existing query. */
export function withOrganizerPassword(url: string, organizerPassword: string | undefined): string {
  if (!organizerPassword) {
    return url;
  }
  return `${url}${url.includes('?') ? '&' : '?'}organizerPassword=${organizerPassword}`;
}

/**
 * The organizer-captain password travels as `?organizerPassword=`. Partial HTMX
 * requests post to URLs without it, so the password is recovered from the
 * browser URL that HTMX forwards as `HX-Current-URL`.
 */
export function organizerPasswordFromRequest(app: App): string {
  const query = app.query('organizerPassword');
  if (query !== undefined) {
    return query;
  }
  try {
    return new URL(app.currentUrl()).searchParams.get('organizerPassword') ?? '';
  } catch {
    return '';
  }
}

/** Edit access requires the organizer-captain password; a missing/wrong password is a 403. */
export async function requireOrganizerCaptain(app: App, session: Postponement): Promise<void> {
  if (!await comparePassword(organizerPasswordFromRequest(app), session.organizerCaptainPasswordHash)) {
    app.failure(app.t('invalid_organizer_password'), 403);
  }
}
