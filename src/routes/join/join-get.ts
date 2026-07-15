import type { App } from '../../app';
import { requireSessionAndToken, requireTeam } from './join-utils';

export const handleJoinGet = (app: App): Response => {
  const team = requireTeam(app);
  const {session, token} = requireSessionAndToken(app);

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
