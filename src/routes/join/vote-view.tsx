import type { App } from '../../app';
import type { AppLocale } from '../../locales';
import type { Player, Postponement, ProposedDate } from '../../lib/models';
import { PostponementRules } from '../../lib/postponement';
import { formatProposedDateDisplay } from '../../lib/temporal-utils';
import { ConfirmedInfoPage } from './confirmed-info';
import type { Team } from './join-utils';
import { VotePage, type PlayerVoteRow, type VotePageDate } from './vote';

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

export function confirmedDateDisplay(session: Postponement, locale: AppLocale): string | undefined {
  const confirmed = session.proposedDates.find((pd) => pd.id === session.confirmedProposedDateId);
  return confirmed
         ? formatProposedDateDisplay(confirmed.dateTimeRange.start, locale)
         : undefined;
}

export function renderConfirmedInfo(app: App, session: Postponement): Response {
  const html = app.render(
    <ConfirmedInfoPage
      {...app.view}
      title={app.t('confirmed_date_title')}
      confirmedDateDisplay={confirmedDateDisplay(session, app.locale)}
      reopenCount={session.reopenCount}
    />,
  );

  return app.c.html(html);
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
  const locale = app.locale;

  if (session.status === 'Confirmed') {
    return renderConfirmedInfo(app, session);
  }

  const rules = new PostponementRules();
  const tallies = rules.tally(session, team);

  const visibleDates = visibleDatesForTeam(session, team);
  const playerVoteRows = buildPlayerVoteRows(session, team, visibleDates);

  const proposedDates: VotePageDate[] = visibleDates.map((pd) => {
    const current = session.votes.find((vt) => vt.proposedDateId === pd.id && vt.participantId === player.id);
    const counts = tallies[pd.id] ?? {yes: 0, no: 0, maybe: 0};
    return {
      id: pd.id,
      display: formatProposedDateDisplay(pd.dateTimeRange.start, locale),
      currentVote: current?.type ?? '',
      yes: counts.yes,
      maybe: counts.maybe,
      no: counts.no,
      clashes: pd.clashes,
    };
  });

  const html = app.render(
    <VotePage
      {...app.view}
      title={app.t('vote_title')}
      sessionId={session.id}
      team={team}
      token={token}
      playerId={player.id}
      playerName={player.name}
      proposedDates={proposedDates}
      playerVoteRows={playerVoteRows}
      clashCheckable={session.homeTeamIdentity !== undefined && session.guestTeamIdentity !== undefined}
      updated={updated}
    />,
  );

  return app.c.html(html);
}
