import type { App } from '../../../app';
import { fetchClubs } from '../../../lib/click-tt-scraper';

export const handleScrapeClubsGet = async (app: App): Promise<Response> => {
  const regionUrl = app.c.req.query('regionUrl');
  if (!regionUrl) {
    app.failure(app.t('missing_param', {name: 'regionUrl'}));
  }

  const regionName = extractRegionName(regionUrl);
  const clubs = await fetchClubs(regionUrl);

  const html = app.render('create/scrape/clubs.eta', {
    title: app.t('scrape_choose_club'),
    isPartial: app.isPartial,
    clubs,
    regionUrl,
    regionName,
  });
  return app.c.html(html);
};

function extractRegionName(regionUrl: string): string {
  try {
    const u = new URL(regionUrl);
    const raw = u.searchParams.get('regionName') ?? '';
    return raw.replace(/\+/g, ' ');
  } catch {
    return '';
  }
}
