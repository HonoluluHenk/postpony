import type { App } from '../../app';
import { PostponementRules } from '../../lib/postponement';
import { requireSessionAndToken, requireTeam } from './join-utils';
import { renderVoteStep } from './vote-view';

export const handleJoinVotePost = async (app: App): Promise<Response> => {
  const team = requireTeam(app);
  const {session, token} = await requireSessionAndToken(app, team);

  const playerId = app.query('playerId') ?? '';
  const player = session.players.find((p) => p.id === playerId && p.teamId === team);
  if (!player) {
    const target = `/join/${session.id}/${team}?token=${encodeURIComponent(token)}`;
    // ponytail: htmx follows a 302 and would swap the register page into
    // #vote-region, so an HTMX save gets a full-page redirect instruction instead.
    if (app.isPartial) {
      app.setHeader('HX-Redirect', target);
      return app.text('');
    }
    return app.redirect(target);
  }

  // ponytail: voting is locked once the admin confirms; a locked POST just
  // re-renders the confirmed-info view via renderVoteStep.
  const canVote = session.status !== 'Confirmed';
  let updated = session;
  if (canVote) {
    const body = await app.body();
    const submissions = new PostponementRules().pollDates(session, team)
      .map((pd) => ({
        dateId: pd.id,
        value: body[`vote-${pd.id}`],
      }));
    updated = new PostponementRules().applyVotes(session, player.id, submissions, team).session;
    await app.store.save(updated);
  }

  return renderVoteStep(app, {session: updated, team, token, player, updated: canVote});
};
