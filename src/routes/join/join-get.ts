import type { App } from '../../app';
import { requireSessionAndToken, requireTeam } from './join-utils';
import { renderConfirmedInfo } from './vote-view';

export const handleJoinGet = async (app: App): Promise<Response> => {
  const team = requireTeam(app);
  const {session, token} = await requireSessionAndToken(app);

  if (session.status === 'Confirmed') {
    return renderConfirmedInfo(app, session);
  }

  const players = session.players.filter((p) => p.teamId === team);

  const html = app.render('join/join.eta', {
    title: app.t('join_title'),
    sessionId: session.id,
    team,
    token,
    players,
  });

  return app.c.html(html);
};
