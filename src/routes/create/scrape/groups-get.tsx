import type { App } from '../../../app';
import { fetchGroups } from '../../../lib/click-tt-scraper';
import { ScrapeGroupsPage } from './groups';

export const handleScrapeGroupsGet = async (app: App): Promise<Response> => {
  const championship = app.query('championship');
  if (!championship) {
    app.failure(app.t('missing_param', {name: 'championship'}));
  }
  const leagueName = app.query('leagueName') ?? '';

  const groups = await fetchGroups(championship);

  const html = app.render(
    <ScrapeGroupsPage
      {...app.view}
      groups={groups}
      leagueName={leagueName}
    />,
  );
  return app.html(html);
};
