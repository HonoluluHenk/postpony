import type { App } from '../../../app';
import { fetchTeams } from '../../../lib/click-tt-scraper';
import { ScrapeTeamsPage } from './teams';

export const handleScrapeTeamsGet = async (app: App): Promise<Response> => {
  const championship = app.query('championship');
  const group = app.query('group');
  if (!championship) {
    app.failure(app.t('missing_param', {name: 'championship'}));
  }
  if (!group) {
    app.failure(app.t('missing_param', {name: 'group'}));
  }
  const leagueName = app.query('leagueName') ?? '';
  const groupName = app.query('groupName') ?? '';

  const teams = await fetchTeams(championship, group);

  const html = app.render(
    <ScrapeTeamsPage
      {...app.view}
      teams={teams}
      championship={championship}
      leagueName={leagueName}
      groupName={groupName}
    />,
  );
  return app.html(html);
};
