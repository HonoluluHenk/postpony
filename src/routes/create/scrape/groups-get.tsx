import type { App } from '../../../app';
import { fetchGroups } from '../../../lib/click-tt-scraper';
import { ScrapeGroupsPage } from './groups';

export const handleScrapeGroupsGet = async (app: App): Promise<Response> => {
  const championship = app.c.req.query('championship');
  if (!championship) {
    app.failure(app.t('missing_param', {name: 'championship'}));
  }
  const leagueName = app.c.req.query('leagueName') ?? '';

  const groups = await fetchGroups(championship);

  const html = app.render(
    <ScrapeGroupsPage
      {...app.view}
      groups={groups}
      leagueName={leagueName}
    />,
  );
  return app.c.html(html);
};
