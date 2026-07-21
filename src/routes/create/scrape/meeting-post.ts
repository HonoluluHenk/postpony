import * as v from 'valibot';
import type { App } from '../../../app';
import { generateId, generateRandomPassword, hashPassword } from '../../../lib/crypto-utils';
import { DEFAULT_CLUB_ID, type RescheduleSession } from '../../../lib/models';
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
});

export const handleScrapeMeetingPost = async (app: App): Promise<Response> => {
  const body = await app.c.req.parseBody();
  const validation = v.safeParse(MeetingSchema, body);
  if (!validation.success) {
    app.failure(app.t('missing_param', {name: 'meeting'}));
  }
  const m = validation.output;

  const id = generateId();
  const ownerPassword = generateRandomPassword();
  const invitationPassword = generateRandomPassword();

  const name = `${m.homeTeam} vs ${m.guestTeam} – ${m.date}${m.time ? ' ' + m.time : ''}`;

  const session: RescheduleSession = {
    id,
    clubId: DEFAULT_CLUB_ID,
    name,
    ownerPasswordHash: hashPassword(ownerPassword),
    invitationPasswordHash: hashPassword(invitationPassword),
    invitationPassword,
    status: 'Draft',
    players: [],
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
