import type { App } from '../../app';
import type { Player, Postponement, ProposedDate, Vote, VoteTallyItem } from '../../lib/models';
import { PostponementRules } from '../../lib/postponement';
import { formatLocalizedDateTime, parseIsoToPlainDateTime } from '../../lib/temporal-utils';
import type { Team } from './join-utils';

interface VotePageDate extends VoteTallyItem {
  currentVote: string;
}

export interface PlayerVoteRow {
  playerName: string;
  votes: (Vote['type'] | null)[];
}

export interface VoteViewOptions {
  session: Postponement;
  team: Team;
  token: string;
  player: Player;
  updated?: boolean;
}

export function visibleDatesForTeam(session: Postponement, team: Team): ProposedDate[] {
  return session.proposedDates.filter((pd) => (team === 'away' ? pd.votableByOpponent : true));
}

export function buildPlayerVoteRows(
  session: Postponement,
  team: Team,
  dates: ProposedDate[],
): PlayerVoteRow[] {
  return session.players
    .filter((p) => p.teamId === team)
    .map((player) => ({
      playerName: player.name,
      votes: dates.map((pd) => {
        const vote = session.votes.find(
          (v) => v.proposedDateId === pd.id && v.participantId === player.id,
        );
        return vote?.type ?? null;
      }),
    }));
}

export function renderVoteStep(app: App, options: VoteViewOptions): Response {
  const {session, team, token, player, updated = false} = options;
  const readOnly = session.status === 'Confirmed';
  const locale = app.locale;

  const rules = new PostponementRules();
  const tallies = rules.tally(session, team);

  const visibleDates = visibleDatesForTeam(session, team);
  const playerVoteRows = buildPlayerVoteRows(session, team, visibleDates);

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
    playerVoteRows,
    readOnly,
    updated,
  });

  return app.c.html(html);
}
