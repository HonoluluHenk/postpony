import type { App } from '../../../app';
import { fetchClubs } from '../../../lib/click-tt-scraper';

export const handleScrapeClubsGet = async (app: App): Promise<Response> => {
  const searchPattern = app.c.req.query('searchPattern');
  const regionName = app.c.req.query('regionName');
  if (!searchPattern) {
    app.failure(app.t('missing_param', {name: 'searchPattern'}));
  }
  if (!regionName) {
    app.failure(app.t('missing_param', {name: 'regionName'}));
  }

  const clubs = await fetchClubs(searchPattern, regionName);

  const html = app.render('create/scrape/clubs.eta', {
    title: app.t('scrape_choose_club'),
    isPartial: app.isPartial,
    clubs,
    searchPattern,
    regionName,
  });
  return app.c.html(html);
};
