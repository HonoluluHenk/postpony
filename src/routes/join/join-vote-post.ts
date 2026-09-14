import type { App } from '../../app';
import { PostponementRules } from '../../lib/postponement';
import { requireSessionAndToken, requireTeam } from './join-utils';
import { renderVoteStep } from './vote-view';

export const handleJoinVotePost = async (app: App): Promise<Response> => {
  const team = requireTeam(app);
  const {session, token} = await requireSessionAndToken(app);

  const playerId = app.query('playerId') ?? '';
  const player = session.players.find((p) => p.id === playerId && p.teamId === team);
  if (!player) {
    return app.redirect(`/join/${session.id}/${team}?token=${encodeURIComponent(token)}`);
  }

  // ponytail: voting is locked once the admin confirms; a locked POST just
  // re-renders the confirmed-info view via renderVoteStep.
  const canVote = session.status !== 'Confirmed';
  let updated = session;
  if (canVote) {
    const body = await app.body();
    const submissions = session.proposedDates.map((pd) => ({
      dateId: pd.id,
      value: body[`vote-${pd.id}`],
    }));
    updated = new PostponementRules().applyVotes(session, player.id, submissions).session;
    await app.store.save(updated);
  }

  return renderVoteStep(app, {session: updated, team, token, player, updated: canVote});
};
