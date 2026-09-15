import type { App } from '../../app';
import { comparePassword } from '../../lib/crypto-utils';
import type { Postponement, Vote } from '../../lib/models';
import { isVoteType, PostponementRules } from '../../lib/postponement';

export type Team = 'home' | 'away';

export interface PendingVote {
  dateId: string;
  value: Vote['type'];
}

/**
 * Reads pending vote-<dateId>=<value> fields from a query-lookup, scoped to the
 * dates in the given team's poll (`pollDates`). Only structurally valid dateIds
 * (real poll dates) and whitelisted values (Yes|IfNecessary|No) are returned —
 * arbitrary query strings are never echoed.
 *
 * Used by both the fallback redirect (unknown playerId) and the register POST
 * redirect so one mechanism covers both personalized and unpersonalized paths.
 */
export function readPendingVotes(
  lookup: (name: string) => string | undefined,
  session: Postponement,
  team: Team,
): PendingVote[] {
  const rules = new PostponementRules();
  const pending: PendingVote[] = [];
  for (const pd of rules.pollDates(session, team)) {
    const value = lookup(`vote-${pd.id}`);
    if (isVoteType(value)) {
      pending.push({dateId: pd.id, value});
    }
  }
  return pending;
}

/**
 * Serialises pending votes into a URL query suffix (e.g.
 * "vote-proposed-date-1=Yes&vote-proposed-date-2=No"). Returns an empty string
 * when there are no pending votes.
 */
export function pendingVoteQuery(pending: readonly PendingVote[]): string {
  return pending
    .map(({dateId, value}) => `vote-${encodeURIComponent(dateId)}=${value}`)
    .join('&');
}

export function requireTeam(app: App): Team {
  const team = app.requireParam('team');
  if (team !== 'home' && team !== 'away') {
    app.failure(app.t('join_invalid_team'), 400);
  }
  return team;
}

export interface JoinContext {
  id: string;
  session: Postponement;
  token: string;
}

export async function requireSessionAndToken(app: App, team: Team): Promise<JoinContext> {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound(app.t('session_not_found'));
  }

  const token = app.query('token') ?? '';
  const ownHash = team === 'home' ? session.homePlayerPasswordHash : session.awayPlayerPasswordHash;
  const otherHash = team === 'home' ? session.awayPlayerPasswordHash : session.homePlayerPasswordHash;

  if (token && await comparePassword(token, ownHash)) {
    return {id, session, token};
  }
  if (token && await comparePassword(token, otherHash)) {
    app.failure(app.t('join_wrong_team_token'), 403);
  }
  app.failure(app.t('join_invalid_token'), 403);
}
