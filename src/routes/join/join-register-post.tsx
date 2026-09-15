import type { App } from '../../app';
import { PostponementRules } from '../../lib/postponement';
import { JoinPage } from './join';
import { pendingVoteQuery, readPendingVotes, requireSessionAndToken, requireTeam } from './join-utils';

export const handleJoinRegisterPost = async (app: App): Promise<Response> => {
  const team = requireTeam(app);
  const {id, session, token} = await requireSessionAndToken(app, team);

  if (session.status === 'Confirmed') {
    return app.redirect(`/join/${id}/${team}?token=${encodeURIComponent(token)}`);
  }

  const body = await app.body();

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
        pendingVotes={readPendingVotes(app.query.bind(app), session, team)}
        error={app.t('join_select_required')}
      />,
    );
    return app.html(html);
  }

  await app.store.save(updated);

  const pendingQuery = pendingVoteQuery(readPendingVotes(app.query.bind(app), session, team));
  return app.redirect(
    `/join/${id}/${team}/vote?playerId=${encodeURIComponent(player.id)}` +
    `&token=${encodeURIComponent(token)}` +
    (pendingQuery ? `&${pendingQuery}` : ''),
  );
};
