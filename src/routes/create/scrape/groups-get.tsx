import type { App } from '../../../app';
import { fetchGroups } from '../../../lib/click-tt-scraper';
import { changeQuerySuffix } from '../change-utils';
import { ScrapeGroupsPage } from './groups';

export const handleScrapeGroupsGet = async (app: App): Promise<Response> => {
  const championship = app.c.req.query('championship');
  if (!championship) {
    app.failure(app.t('missing_param', {name: 'championship'}));
  }
  const leagueName = app.c.req.query('leagueName') ?? '';
  const sessionId = app.c.req.query('sessionId');
  const ownerPassword = app.c.req.query('ownerPassword');
  const changeMode = !!sessionId;

  const groups = await fetchGroups(championship);

  const html = app.render(
    <ScrapeGroupsPage
      {...app.view}
      groups={groups}
      leagueName={leagueName}
      changeMode={changeMode}
      changeSuffix={changeQuerySuffix(sessionId, ownerPassword)}
      sessionId={sessionId}
      ownerPassword={ownerPassword}
    />,
  );
  return app.c.html(html);
};
