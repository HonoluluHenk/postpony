import type { App } from '../../../app';
import { fetchMeetings } from '../../../lib/click-tt-scraper';

export const handleScrapeMeetingsGet = async (app: App): Promise<Response> => {
  const leagueUrl = app.c.req.query('leagueUrl');
  if (!leagueUrl) {
    app.failure(app.t('missing_param', {name: 'leagueUrl'}));
  }
  const teamName = app.c.req.query('teamName') ?? '';
  const leagueName = app.c.req.query('leagueName') ?? '';
  const clubName = app.c.req.query('clubName') ?? '';
  const clubUrl = app.c.req.query('clubUrl') ?? '';

  const meetings = await fetchMeetings(leagueUrl);

  const html = app.render('create/scrape/meetings.eta', {
    title: app.t('scrape_choose_match'),
    isPartial: app.isPartial,
    meetings,
    teamName,
    leagueName,
    leagueUrl,
    clubName,
    clubUrl,
  });
  return app.c.html(html);
};
