import * as v from 'valibot';
import type { App } from '../../../app';
import { fetchPlayers } from '../../../lib/click-tt-scraper';
import { generateId, generateRandomPassword, hashPassword } from '../../../lib/crypto-utils';
import { DEFAULT_CLUB_ID, type Player, type RescheduleSession } from '../../../lib/models';
import { parseClickTtDateTime } from '../../../lib/temporal-utils';

const MeetingSchema = v.object({
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

export const handleScrapeMeetingPost = async (app: App): Promise<Response> => {
  const body = await app.c.req.parseBody({all: true});
  const validation = v.safeParse(MeetingSchema, body);
  if (!validation.success) {
    app.failure(app.t('missing_param', {name: 'meeting'}));
  }
  const m = validation.output;

  const id = generateId();
  const ownerPassword = generateRandomPassword();
  const invitationPassword = generateRandomPassword();

  const name = `${m.homeTeam} vs ${m.guestTeam} – ${m.date}${m.time ? ' ' + m.time : ''}`;

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

  const session: RescheduleSession = {
    id,
    clubId: DEFAULT_CLUB_ID,
    name,
    ownerPasswordHash: hashPassword(ownerPassword),
    invitationPasswordHash: hashPassword(invitationPassword),
    invitationPassword,
    status: 'Draft',
    players,
    proposedDates: [],
    votes: [],
    originalMatchDateTime: parseClickTtDateTime(m.date, m.time),
    createdAt: app.timestamp.now(),
    metadata: {
      source: 'click-tt.ch',
      meeting: {
        day: m.day,
        date: m.date,
        time: m.time,
        homeTeam: m.homeTeam,
        guestTeam: m.guestTeam,
      },
      league: m.leagueName,
      group: m.groupName,
      championship: m.championship,
      groupId: m.group,
    },
  };

  app.sessions[id] = session;

  const redirectUrl = `/edit/${id}?ownerPassword=${ownerPassword}`;
  if (app.isPartial) {
    app.c.header('HX-Redirect', redirectUrl);
    return app.c.text('', 200);
  }
  return app.c.redirect(redirectUrl);
};
