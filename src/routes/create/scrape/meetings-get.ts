import type { App } from '../../../app';
import { fetchMeetings } from '../../../lib/click-tt-scraper';

export const handleScrapeMeetingsGet = async (app: App): Promise<Response> => {
  const championship = app.c.req.query('championship');
  const group = app.c.req.query('group');
  if (!championship) {
    app.failure(app.t('missing_param', {name: 'championship'}));
  }
  if (!group) {
    app.failure(app.t('missing_param', {name: 'group'}));
  }
  const teamName = app.c.req.query('teamName') ?? '';
  const leagueName = app.c.req.query('leagueName') ?? '';
  const clubName = app.c.req.query('clubName') ?? '';
  const club = app.c.req.query('club') ?? '';
  const searchPattern = app.c.req.query('searchPattern') ?? '';
  const regionName = app.c.req.query('regionName') ?? '';

  const meetings = await fetchMeetings(championship, group);

  const html = app.render('create/scrape/meetings.eta', {
    title: app.t('scrape_choose_match'),
    isPartial: app.isPartial,
    meetings,
    teamName,
    leagueName,
    championship,
    group,
    clubName,
    club,
    searchPattern,
    regionName,
  });
  return app.c.html(html);
};
