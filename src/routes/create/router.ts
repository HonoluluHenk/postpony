import { factory, handleAppRequest } from '../../lib/hono-factory';
import { handleScrapeGroupsGet } from './scrape/groups-get';
import { handleScrapeLeaguesGet } from './scrape/leagues-get';
import { handleScrapeMatchPost } from './scrape/match-post';
import { handleScrapeMatchesGet } from './scrape/matches-get';
import { handleScrapeTeamsGet } from './scrape/teams-get';

const createRouter = factory.createApp();

createRouter.get('/scrape', handleAppRequest(handleScrapeLeaguesGet));
createRouter.get('/scrape/groups', handleAppRequest(handleScrapeGroupsGet));
createRouter.get('/scrape/teams', handleAppRequest(handleScrapeTeamsGet));
createRouter.get('/scrape/matches', handleAppRequest(handleScrapeMatchesGet));
createRouter.post('/scrape/match', handleAppRequest(handleScrapeMatchPost));

export default createRouter;
