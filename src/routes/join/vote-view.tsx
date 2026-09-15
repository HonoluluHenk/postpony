import type { App } from '../../app';
import type { AppLocale } from '../../locales';
import type { Player, Postponement } from '../../lib/models';
import { PostponementRules, type VoteTally } from '../../lib/postponement';
import { formatProposedDateDisplay } from '../../lib/temporal-utils';
import { ConfirmedInfoPage } from './confirmed-info';
import type { Team } from './join-utils';
import { VotePage, type VotePageDate } from './vote';

export interface VoteViewOptions {
  session: Postponement;
  team: Team;
  token: string;
  player: Player;
  updated?: boolean;
}

export function confirmedDateDisplay(session: Postponement, locale: AppLocale): string | undefined {
  const confirmed = session.proposedDates.find((pd) => pd.id === session.confirmedProposedDateId);
  return confirmed
         ? formatProposedDateDisplay(confirmed.dateTimeRange.start, locale)
         : undefined;
}

export function renderConfirmedInfo(
  app: App,
  session: Postponement,
  context: {team: Team; token: string; playerId?: string},
): Response {
  const {team, token} = context;
  const hasVotableDates = new PostponementRules().votableDates(session).length > 0;
  const html = app.render(
    <ConfirmedInfoPage
      {...app.view}
      title={app.t('confirmed_date_title')}
      confirmedDateDisplay={confirmedDateDisplay(session, app.locale)}
      reopenCount={session.reopenCount}
      sessionId={session.id}
      team={team}
      token={token}
      playerId={context.playerId}
      hasVotableDates={hasVotableDates}
    />,
  );

  return app.html(html);
}

export function renderVoteStep(app: App, options: VoteViewOptions): Response {
  const {session, team, token, player, updated = false} = options;
  const locale = app.locale;

  if (session.status === 'Confirmed') {
    return renderConfirmedInfo(app, session, {team, token, playerId: player.id});
  }

  const rules = new PostponementRules();
  const tallies = rules.tally(session, team);

  const visibleDates = rules.pollDates(session, team);

  const proposedDates: VotePageDate[] = visibleDates.map((pd) => {
    const current = session.votes.find((vt) => vt.proposedDateId === pd.id && vt.participantId === player.id);
    // ponytail: tallies are keyed by every proposed date, so the lookup is
    // guaranteed for a votable date; a cast keeps a dead branch out.
    const counts = tallies[pd.id] as VoteTally;
    return {
      id: pd.id,
      display: formatProposedDateDisplay(pd.dateTimeRange.start, locale),
      currentVote: current?.type ?? '',
      yes: counts.yes,
      ifNecessary: counts.ifNecessary,
      no: counts.no,
      venueNumber: pd.venueNumber,
      venueOccupancy: pd.venueOccupancy,
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
      proposedDates={proposedDates}
      venues={session.venues}
      updated={updated}
    />,
  );

  return app.html(html);
}
