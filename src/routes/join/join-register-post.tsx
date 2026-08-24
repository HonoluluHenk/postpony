import type { App } from '../../app';
import { PostponementRules } from '../../lib/postponement';
import { JoinPage } from './join';
import { requireSessionAndToken, requireTeam } from './join-utils';

export const handleJoinRegisterPost = async (app: App): Promise<Response> => {
  const team = requireTeam(app);
  const {id, session, token} = await requireSessionAndToken(app);

  if (session.status === 'Confirmed') {
    return app.c.redirect(`/join/${id}/${team}?token=${encodeURIComponent(token)}`);
  }

  const body = await app.c.req.parseBody();

  const {session: updated, player} = new PostponementRules().registerParticipant(session, team, {
    name: body['newPlayerName'] as string | undefined,
    playerId: body['playerId'] as string | undefined,
  });

  if (!player) {
    const players = session.players.filter((p) => p.teamId === team);
    const html = app.render(
      <JoinPage
        {...app.view}
        title={app.t('join_title')}
        sessionId={id}
        team={team}
        token={token}
        players={players}
        error={app.t('join_select_required')}
      />,
    );
    return app.c.html(html);
  }

  await app.store.save(updated);

  const voteUrl = `/join/${id}/${team}/vote?playerId=${encodeURIComponent(player.id)}` +
    `&token=${encodeURIComponent(token)}`;
  return app.c.redirect(voteUrl);
};
