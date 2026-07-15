import type { App } from '../../app';
import { generateId } from '../../lib/crypto-utils';
import type { Player } from '../../lib/models';
import { requireSessionAndToken, requireTeam } from './join-utils';

export const handleJoinRegisterPost = async (app: App): Promise<Response> => {
  const team = requireTeam(app);
  const {id, session, token} = requireSessionAndToken(app);

  const body = await app.c.req.parseBody();
  const newPlayerName = ((body['newPlayerName'] as string | undefined) ?? '').trim();
  const selectedPlayerId = (body['playerId'] as string | undefined) ?? '';

  const teamPlayers = session.players.filter((p) => p.teamId === team);

  let player: Player | undefined;
  if (newPlayerName) {
    player = teamPlayers.find((p) => p.name.toLowerCase() === newPlayerName.toLowerCase());
    if (!player) {
      player = {id: generateId(), name: newPlayerName, teamId: team};
      session.players.push(player);
    }
  } else if (selectedPlayerId) {
    player = teamPlayers.find((p) => p.id === selectedPlayerId);
  }

  if (!player) {
    app.failure(app.t('join_select_required'), 400);
  }

  const voteUrl = `/join/${id}/${team}/vote?playerId=${encodeURIComponent(player.id)}` +
    `&token=${encodeURIComponent(token)}`;
  return app.c.redirect(voteUrl);
};
