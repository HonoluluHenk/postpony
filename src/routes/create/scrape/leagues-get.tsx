import type { App } from '../../../app';
import { fetchLeagues } from '../../../lib/click-tt-scraper';
import { changeQuerySuffix } from '../change-utils';
import { ScrapeLeaguesPage } from './leagues';

export const handleScrapeLeaguesGet = async (app: App): Promise<Response> => {
  const sessionId = app.c.req.query('sessionId');
  const ownerPassword = app.c.req.query('ownerPassword');
  const changeMode = !!sessionId;

  const leagues = await fetchLeagues();
  const html = app.render(
    <ScrapeLeaguesPage
      {...app.view}
      leagues={leagues}
      changeMode={changeMode}
      changeSuffix={changeQuerySuffix(sessionId, ownerPassword)}
      sessionId={sessionId}
      ownerPassword={ownerPassword}
    />,
  );
  return app.c.html(html);
};
