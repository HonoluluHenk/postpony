import type { App } from '../../../app';
import { fetchGroups } from '../../../lib/click-tt-scraper';

export const handleScrapeGroupsGet = async (app: App): Promise<Response> => {
  const championship = app.c.req.query('championship');
  if (!championship) {
    app.failure(app.t('missing_param', {name: 'championship'}));
  }
  const leagueName = app.c.req.query('leagueName') ?? '';

  const groups = await fetchGroups(championship);

  const html = app.render('create/scrape/groups.eta', {
    title: app.t('scrape_choose_group'),
    isPartial: app.isPartial,
    groups,
    championship,
    leagueName,
  });
  return app.c.html(html);
};
