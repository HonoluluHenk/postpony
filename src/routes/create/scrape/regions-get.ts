import type { App } from '../../../app';
import { fetchRegions } from '../../../lib/click-tt-scraper';

export const handleScrapeRegionsGet = async (app: App): Promise<Response> => {
  const regions = await fetchRegions();
  const html = app.render('create/scrape/regions.eta', {
    title: app.t('scrape_start_wizard'),
    isPartial: app.isPartial,
    regions,
  });
  return app.c.html(html);
};
