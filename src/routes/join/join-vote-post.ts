import type { App } from '../../app';
import { PostponementRules } from '../../lib/postponement';
import { isVoteType, requireSessionAndToken, requireTeam } from './join-utils';
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
    const rules = new PostponementRules();
    const body = await app.body();
    for (const pd of rules.votableDates(session)) {
      const value = body[`vote-${pd.id}`];
      if (!isVoteType(value)) {
        continue;
      }
      updated = rules.castVote(updated, pd.id, player.id, value);
    }
    await app.store.save(updated);
  }

  return renderVoteStep(app, {session: updated, team, token, player, updated: canVote});
};
