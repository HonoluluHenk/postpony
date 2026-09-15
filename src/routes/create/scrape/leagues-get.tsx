import type { App } from '../../../app';
import { fetchLeagues } from '../../../lib/click-tt-scraper';
import { ScrapeLeaguesPage } from './leagues';
import { renderScrapeStepError } from './scrape-step-error';

export const handleScrapeLeaguesGet = async (app: App): Promise<Response> => {
  try {
    const leagues = await fetchLeagues();
    const html = app.render(
      <ScrapeLeaguesPage
        {...app.view}
        leagues={leagues}
      />,
    );
    return app.html(html);
  } catch (err) {
    return renderScrapeStepError(app, err, '/create/scrape');
  }
};
