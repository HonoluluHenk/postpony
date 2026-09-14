import type { App } from '../../app';
import { JoinPage } from './join';
import { readPendingVotes, requireSessionAndToken, requireTeam } from './join-utils';
import { renderConfirmedInfo } from './vote-view';

export const handleJoinGet = async (app: App): Promise<Response> => {
  const team = requireTeam(app);
  const {session, token} = await requireSessionAndToken(app);

  if (session.status === 'Confirmed') {
    return renderConfirmedInfo(app, session, {team, token});
  }

  const players = session.players.filter((p) => p.teamId === team);
  const pendingVotes = readPendingVotes(app, session);

  const html = app.render(
    <JoinPage
      {...app.view}
      title={app.t('join_title')}
      sessionId={session.id}
      team={team}
      token={token}
      players={players}
      pendingVotes={pendingVotes}
    />,
  );

  return app.html(html);
};
