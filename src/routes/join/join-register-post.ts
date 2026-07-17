import type { App } from '../../app';
import { Reschedule } from '../../lib/reschedule';
import { requireSessionAndToken, requireTeam } from './join-utils';

export const handleJoinRegisterPost = async (app: App): Promise<Response> => {
  const team = requireTeam(app);
  const {id, session, token} = requireSessionAndToken(app);

  const body = await app.c.req.parseBody();

  const {session: updated, player} = new Reschedule().registerParticipant(session, team, {
    name: body['newPlayerName'] as string | undefined,
    playerId: body['playerId'] as string | undefined,
  });

  if (!player) {
    app.failure(app.t('join_select_required'), 400);
  }

  app.sessions[id] = updated;

  const voteUrl = `/join/${id}/${team}/vote?playerId=${encodeURIComponent(player.id)}` +
    `&token=${encodeURIComponent(token)}`;
  return app.c.redirect(voteUrl);
};
