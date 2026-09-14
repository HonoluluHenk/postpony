import type { App } from '../../app';
import { PostponementRules } from '../../lib/postponement';
import { pendingVoteQuery, readPendingVotes, requireSessionAndToken, requireTeam } from './join-utils';
import { renderVoteStep } from './vote-view';

export const handleJoinVoteGet = async (app: App): Promise<Response> => {
  const team = requireTeam(app);
  const {session, token} = await requireSessionAndToken(app);

  const playerId = app.query('playerId') ?? '';
  const player = session.players.find((p) => p.id === playerId && p.teamId === team);
  if (!player) {
    const pendingQuery = pendingVoteQuery(readPendingVotes(app.query.bind(app), session));
    return app.redirect(
      `/join/${session.id}/${team}?token=${encodeURIComponent(token)}` +
      (pendingQuery ? `&${pendingQuery}` : ''),
    );
  }

  // ponytail: a GET casts a Vote to make one-click calendar links work. The
  // trade-off: a state-changing GET. It stays safe because each click casts at
  // most one idempotent upsert (castVote), the session short-circuits once
  // Confirmed, and the request is invitation-token-gated. Upgrade path: a
  // signed one-time link or a POST behind a form if links ever go untokenized.
  const canVote = session.status !== 'Confirmed';
  let updated = session;
  let cast = false;
  if (canVote) {
    const submissions = session.proposedDates.map((pd) => ({
      dateId: pd.id,
      value: app.query(`vote-${pd.id}`),
    }));
    const applied = new PostponementRules().applyVotes(updated, player.id, submissions);
    updated = applied.session;
    cast = applied.changed;
    if (cast) {
      await app.store.save(updated);
    }
  }

  return renderVoteStep(app, {session: updated, team, token, player, updated: cast});
};
