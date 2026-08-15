import type { App } from '../../app';
import type { Vote } from '../../lib/models';
import { PostponementRules } from '../../lib/postponement';
import { requireSessionAndToken, requireTeam } from './join-utils';
import { renderVoteStep } from './vote-view';

function isVoteType(value: unknown): value is Vote['type'] {
  return value === 'Yes' || value === 'No' || value === 'Maybe';
}

export const handleJoinVotePost = async (app: App): Promise<Response> => {
  const team = requireTeam(app);
  const {session, token} = await requireSessionAndToken(app);

  const playerId = app.c.req.query('playerId') ?? '';
  const player = session.players.find((p) => p.id === playerId && p.teamId === team);
  if (!player) {
    return app.c.redirect(`/join/${session.id}/${team}?token=${encodeURIComponent(token)}`);
  }

  // ponytail: voting is locked once the admin confirms; a locked POST just re-renders read-only.
  const canVote = session.status !== 'Confirmed';
  let updated = session;
  if (canVote) {
    const rules = new PostponementRules();
    const body = await app.c.req.parseBody();
    for (const pd of session.proposedDates) {
      if (team === 'away' && !pd.votableByOpponent) {
        continue;
      }
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
