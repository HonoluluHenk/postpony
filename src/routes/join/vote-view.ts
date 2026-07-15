import type { App } from '../../app';
import type { Player, RescheduleSession } from '../../lib/models';
import { formatLocalizedDateTime, parseIsoToPlainDateTime } from '../../lib/temporal-utils';
import { toIntlLocale } from '../../locales';
import type { Team } from './join-utils';

export interface VoteViewOptions {
  session: RescheduleSession;
  team: Team;
  token: string;
  player: Player;
  updated?: boolean;
}

export function renderVoteStep(app: App, options: VoteViewOptions): Response {
  const {session, team, token, player, updated = false} = options;
  const readOnly = session.status === 'Confirmed';
  const locale = toIntlLocale(app.locale);

  const proposedDates = session.proposedDates.map((pd) => {
    const dateVotes = session.votes.filter((vt) => vt.proposedDateId === pd.id);
    const current = dateVotes.find((vt) => vt.participantId === player.id);
    return {
      id: pd.id,
      display: formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), locale),
      currentVote: current?.type ?? '',
      yes: dateVotes.filter((vt) => vt.type === 'Yes').length,
      maybe: dateVotes.filter((vt) => vt.type === 'Maybe').length,
      no: dateVotes.filter((vt) => vt.type === 'No').length,
    };
  });

  const html = app.render('join/vote.eta', {
    title: app.t('vote_title'),
    sessionId: session.id,
    team,
    token,
    playerId: player.id,
    playerName: player.name,
    proposedDates,
    readOnly,
    updated,
  });

  return app.c.html(html);
}
