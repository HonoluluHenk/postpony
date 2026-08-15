import type { App } from '../../app';
import type { Player, Postponement, VoteTallyItem } from '../../lib/models';
import { PostponementRules } from '../../lib/postponement';
import { formatLocalizedDateTime, parseIsoToPlainDateTime } from '../../lib/temporal-utils';
import type { Team } from './join-utils';

interface VotePageDate extends VoteTallyItem {
  currentVote: string;
}

export interface VoteViewOptions {
  session: Postponement;
  team: Team;
  token: string;
  player: Player;
  updated?: boolean;
}

export function renderVoteStep(app: App, options: VoteViewOptions): Response {
  const {session, team, token, player, updated = false} = options;
  const readOnly = session.status === 'Confirmed';
  const locale = app.locale;

  const rules = new PostponementRules();
  const tallies = rules.tally(session, team);

  const visibleDates = session.proposedDates.filter((pd) =>
    team === 'away' ? pd.votableByOpponent : true,
  );

  const proposedDates: VotePageDate[] = visibleDates.map((pd) => {
    const current = session.votes.find((vt) => vt.proposedDateId === pd.id && vt.participantId === player.id);
    const counts = tallies[pd.id] ?? {yes: 0, no: 0, maybe: 0};
    return {
      id: pd.id,
      display: formatLocalizedDateTime(parseIsoToPlainDateTime(pd.dateTimeRange.start), locale),
      currentVote: current?.type ?? '',
      yes: counts.yes,
      maybe: counts.maybe,
      no: counts.no,
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
