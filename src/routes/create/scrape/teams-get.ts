import type { App } from '../../../app';
import { fetchTeams } from '../../../lib/click-tt-scraper';

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

  const teams = await fetchTeams(championship, group);

  const html = app.render('create/scrape/teams.eta', {
    title: app.t('scrape_choose_team'),
    isPartial: app.isPartial,
    teams,
    championship,
    group,
    leagueName,
    groupName,
  });
  return app.c.html(html);
};
