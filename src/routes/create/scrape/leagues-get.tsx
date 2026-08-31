import type { App } from '../../../app';
import { fetchLeagues } from '../../../lib/click-tt-scraper';
import { ScrapeLeaguesPage } from './leagues';

export const handleScrapeLeaguesGet = async (app: App): Promise<Response> => {
  const leagues = await fetchLeagues();
  const html = app.render(
    <ScrapeLeaguesPage
      {...app.view}
      leagues={leagues}
    />,
  );
  return app.c.html(html);
};
