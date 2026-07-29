import type { App } from '../../app';
import { requireSessionAndToken, requireTeam } from './join-utils';
import { renderVoteStep } from './vote-view';

export const handleJoinVoteGet = async (app: App): Promise<Response> => {
  const team = requireTeam(app);
  const {session, token} = await requireSessionAndToken(app);

  const playerId = app.c.req.query('playerId') ?? '';
  const player = session.players.find((p) => p.id === playerId && p.teamId === team);
  if (!player) {
    return app.c.redirect(`/join/${session.id}/${team}?token=${encodeURIComponent(token)}`);
  }

  return renderVoteStep(app, {session, team, token, player});
};
