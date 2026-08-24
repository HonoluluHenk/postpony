import type { App } from '../../../app';
import { fetchTeams } from '../../../lib/click-tt-scraper';
import { changeQuerySuffix } from '../change-utils';
import { ScrapeTeamsPage } from './teams';

export const handleScrapeTeamsGet = async (app: App): Promise<Response> => {
  const championship = app.c.req.query('championship');
  const group = app.c.req.query('group');
  if (!championship) {
    app.failure(app.t('missing_param', {name: 'championship'}));
  }
  if (!group) {
    app.failure(app.t('missing_param', {name: 'group'}));
  }
  const leagueName = app.c.req.query('leagueName') ?? '';
  const groupName = app.c.req.query('groupName') ?? '';
  const sessionId = app.c.req.query('sessionId');
  const ownerPassword = app.c.req.query('ownerPassword');
  const changeMode = !!sessionId;

  const teams = await fetchTeams(championship, group);

  const html = app.render(
    <ScrapeTeamsPage
      {...app.view}
      teams={teams}
      championship={championship}
      leagueName={leagueName}
      groupName={groupName}
      changeMode={changeMode}
      changeSuffix={changeQuerySuffix(sessionId, ownerPassword)}
      sessionId={sessionId}
      ownerPassword={ownerPassword}
    />,
  );
  return app.c.html(html);
};
