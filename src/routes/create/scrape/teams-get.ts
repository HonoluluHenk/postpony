import type { App } from '../../../app';
import { fetchTeams } from '../../../lib/click-tt-scraper';

export const handleScrapeTeamsGet = async (app: App): Promise<Response> => {
  const club = app.c.req.query('club');
  if (!club) {
    app.failure(app.t('missing_param', {name: 'club'}));
  }
  const clubName = app.c.req.query('clubName') ?? '';
  const searchPattern = app.c.req.query('searchPattern') ?? '';
  const regionName = app.c.req.query('regionName') ?? '';

  const teams = await fetchTeams(club);

  const html = app.render('create/scrape/teams.eta', {
    title: app.t('scrape_choose_team'),
    isPartial: app.isPartial,
    teams,
    club,
    clubName,
    searchPattern,
    regionName,
  });
  return app.c.html(html);
};
