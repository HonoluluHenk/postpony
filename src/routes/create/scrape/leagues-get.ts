import type { App } from '../../../app';
import { fetchLeagues } from '../../../lib/click-tt-scraper';

export const handleScrapeLeaguesGet = async (app: App): Promise<Response> => {
  const leagues = await fetchLeagues();
  const html = app.render('create/scrape/leagues.eta', {
    title: app.t('scrape_start_wizard'),
    isPartial: app.isPartial,
    leagues,
  });
  return app.c.html(html);
};
