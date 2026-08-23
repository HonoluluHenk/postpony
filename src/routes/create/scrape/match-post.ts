import * as v from 'valibot';
import type { App } from '../../../app';
import { fetchPlayers } from '../../../lib/click-tt-scraper';
import { generateId, generateRandomPassword, hashPassword } from '../../../lib/crypto-utils';
import { DEFAULT_CLUB_ID, type Player, type Postponement } from '../../../lib/models';
import { derivePostponementName } from '../../../lib/postponement';
import { parseClickTtDateTime } from '../../../lib/temporal-utils';
import { requireChangeSession } from '../change-utils';

const MatchSchema = v.object({
  day: v.optional(v.string(), ''),
  date: v.pipe(v.string(), v.minLength(1)),
  time: v.optional(v.string(), ''),
  homeTeam: v.pipe(v.string(), v.minLength(1)),
  guestTeam: v.pipe(v.string(), v.minLength(1)),
  groupName: v.optional(v.string(), ''),
  leagueName: v.optional(v.string(), ''),
  championship: v.optional(v.string(), ''),
  group: v.optional(v.string(), ''),
  teamName: v.optional(v.string(), ''),
  opponentTeamtable: v.optional(v.string(), ''),
});

function parsePlayerNames(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((n): n is string => typeof n === 'string' && n.length > 0);
  }
  if (typeof raw === 'string' && raw.length > 0) {
    return [raw];
  }
  return [];
}

function makePlayer(name: string, teamId: 'home' | 'away'): Player {
  return {id: generateId(), name, teamId};
}

export const handleScrapeMatchPost = async (app: App): Promise<Response> => {
  const body = await app.c.req.parseBody({all: true});
  const validation = v.safeParse(MatchSchema, body);
  if (!validation.success) {
    app.failure(app.t('missing_param', {name: 'match'}));
  }
  const m = validation.output;

  const sessionId = typeof body['sessionId'] === 'string' ? body['sessionId'] : undefined;
  const ownerPassword = typeof body['ownerPassword'] === 'string' ? body['ownerPassword'] : undefined;
  const changeMode = !!sessionId;

  const originalMatchDateTime = parseClickTtDateTime(m.date, m.time);
  const name = derivePostponementName(m.homeTeam, m.guestTeam, originalMatchDateTime, app.locale);

  const selectedTeamPlayers = parsePlayerNames(body['playerName']);
  const selectedTeamId: 'home' | 'away' = m.teamName === m.homeTeam ? 'home' : 'away';
  const players: Player[] = selectedTeamPlayers.map((pn) => makePlayer(pn, selectedTeamId));

  const opponentTeamId: 'home' | 'away' = selectedTeamId === 'home' ? 'away' : 'home';
  if (m.opponentTeamtable) {
    const opponentPlayers = await fetchPlayers(m.championship, m.group, m.opponentTeamtable);
    for (const op of opponentPlayers) {
      players.push(makePlayer(op.name, opponentTeamId));
    }
  }

  const metadata = {
    source: 'click-tt.ch',
    league: m.leagueName,
    group: m.groupName,
    championship: m.championship,
    groupId: m.group,
  };

  let id: string;
  let redirectOwnerPassword: string;
  let session: Postponement;

  if (changeMode) {
    if (!ownerPassword) {
      app.failure(app.t('invalid_owner_password'), 403);
    }
    const existing = await requireChangeSession(app, sessionId, ownerPassword);
    id = existing.id;
    redirectOwnerPassword = ownerPassword;
    // A re-scrape replaces the rosters with the new match's players; the rest
    // of the session (id, passwords, votes, proposed dates) is preserved.
    session = {
      ...existing,
      name,
      homeTeam: m.homeTeam,
      guestTeam: m.guestTeam,
      originalMatchDateTime,
      organizerTeam: selectedTeamId,
      players,
      metadata,
    };
  } else {
    id = generateId();
    redirectOwnerPassword = generateRandomPassword();
    const invitationPassword = generateRandomPassword();

    session = {
      id,
      clubId: DEFAULT_CLUB_ID,
      name,
      homeTeam: m.homeTeam,
      guestTeam: m.guestTeam,
      ownerPasswordHash: await hashPassword(redirectOwnerPassword),
      invitationPasswordHash: await hashPassword(invitationPassword),
      invitationPassword,
      status: 'Draft',
      organizerTeam: selectedTeamId,
      reopenCount: 0,
      players,
      proposedDates: [],
      votes: [],
      originalMatchDateTime,
      createdAt: app.timestamp.now(),
      metadata,
    };
  }

  await app.store.save(session);

  const redirectUrl = `/edit/${id}?ownerPassword=${redirectOwnerPassword}`;
  if (app.isPartial) {
    app.c.header('HX-Redirect', redirectUrl);
    return app.c.text('', 200);
  }
  return app.c.redirect(redirectUrl);
};
