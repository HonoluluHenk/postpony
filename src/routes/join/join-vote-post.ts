import type { App } from '../../app';
import { generateId } from '../../lib/crypto-utils';
import type { Vote } from '../../lib/models';
import { requireSessionAndToken, requireTeam } from './join-utils';
import { renderVoteStep } from './vote-view';

function isVoteType(value: unknown): value is Vote['type'] {
  return value === 'Yes' || value === 'No' || value === 'Maybe';
}

export const handleJoinVotePost = async (app: App): Promise<Response> => {
  const team = requireTeam(app);
  const {session, token} = requireSessionAndToken(app);

  const playerId = app.c.req.query('playerId') ?? '';
  const player = session.players.find((p) => p.id === playerId && p.teamId === team);
  if (!player) {
    return app.c.redirect(`/join/${session.id}/${team}?token=${encodeURIComponent(token)}`);
  }

  // ponytail: voting is locked once the admin confirms; a locked POST just re-renders read-only.
  const canVote = session.status !== 'Confirmed';
  if (canVote) {
    const body = await app.c.req.parseBody();
    for (const pd of session.proposedDates) {
      const value = body[`vote-${pd.id}`];
      if (!isVoteType(value)) {
        continue;
      }
      const existing = session.votes.find(
        (vt) => vt.proposedDateId === pd.id && vt.participantId === player.id,
      );
      if (existing) {
        existing.type = value;
      } else {
        session.votes.push({
          id: generateId(),
          proposedDateId: pd.id,
          participantId: player.id,
          type: value,
        } satisfies Vote);
      }
    }
  }

  return renderVoteStep(app, {session, team, token, player, updated: canVote});
};
