import type { App } from '../../../app';
import { fetchLeagues } from '../../../lib/click-tt-scraper';
import { changeQuerySuffix } from '../change-utils';

export const handleScrapeLeaguesGet = async (app: App): Promise<Response> => {
  const sessionId = app.c.req.query('sessionId');
  const ownerPassword = app.c.req.query('ownerPassword');
  const changeMode = !!sessionId;

  const leagues = await fetchLeagues();
  const html = app.render('create/scrape/leagues.eta', {
    title: app.t('scrape_start_wizard'),
    isPartial: app.isPartial,
    leagues,
    changeMode,
    changeSuffix: changeQuerySuffix(sessionId, ownerPassword),
    sessionId,
    ownerPassword,
  });
  return app.c.html(html);
};
