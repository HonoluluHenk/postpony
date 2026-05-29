import type { App } from '../../../app';
import { fetchTeams } from '../../../lib/click-tt-scraper';

export const handleScrapeTeamsGet = async (app: App): Promise<Response> => {
  const clubUrl = app.c.req.query('clubUrl');
  if (!clubUrl) {
    app.failure(app.t('missing_param', {name: 'clubUrl'}));
  }
  const regionUrl = app.c.req.query('regionUrl') ?? '';

  const teams = await fetchTeams(clubUrl);
  const clubName = app.c.req.query('clubName') ?? '';

  const html = app.render('create/scrape/teams.eta', {
    title: app.t('scrape_choose_team'),
    isPartial: app.isPartial,
    teams,
    clubUrl,
    clubName,
    regionUrl,
  });
  return app.c.html(html);
};
