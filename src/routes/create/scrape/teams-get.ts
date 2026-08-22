import type { App } from '../../../app';
import { fetchTeams } from '../../../lib/click-tt-scraper';
import { changeQuerySuffix } from '../change-utils';

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

  const html = app.render('create/scrape/teams.eta', {
    title: app.t('scrape_choose_team'),
    isPartial: app.isPartial,
    teams,
    championship,
    group,
    leagueName,
    groupName,
    changeMode,
    changeSuffix: changeQuerySuffix(sessionId, ownerPassword),
    sessionId,
    ownerPassword,
  });
  return app.c.html(html);
};
