import type { App } from '../../app';
import { hashPassword } from '../../lib/crypto-utils';
import type { RescheduleSession } from '../../lib/models';

export type Team = 'home' | 'away';

export function requireTeam(app: App): Team {
  const team = app.requireParam('team');
  if (team !== 'home' && team !== 'away') {
    app.failure(app.t('join_invalid_team'), 400);
  }
  return team;
}

export interface JoinContext {
  id: string;
  session: RescheduleSession;
  token: string;
}

export function requireSessionAndToken(app: App): JoinContext {
  const id = app.requireParam('id');
  const session = app.sessions[id];
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const token = app.c.req.query('token') ?? '';
  if (!token || hashPassword(token) !== session.invitationPasswordHash) {
    app.failure(app.t('join_invalid_token'), 403);
  }

  return {id, session, token};
}
