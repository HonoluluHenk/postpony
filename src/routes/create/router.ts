import { factory, handleAppRequest } from '../../lib/hono-factory';
import { handleCreateGet } from './create-get';
import { handleCreatePost } from './create-post';
import { handleScrapeGroupsGet } from './scrape/groups-get';
import { handleScrapeLeaguesGet } from './scrape/leagues-get';
import { handleScrapeMeetingPost } from './scrape/meeting-post';
import { handleScrapeMeetingsGet } from './scrape/meetings-get';
import { handleScrapeTeamsGet } from './scrape/teams-get';

const createRouter = factory.createApp();

createRouter.get('/', handleAppRequest(handleCreateGet));
createRouter.post('/', handleAppRequest(handleCreatePost));
createRouter.get('/scrape', handleAppRequest(handleScrapeLeaguesGet));
createRouter.get('/scrape/groups', handleAppRequest(handleScrapeGroupsGet));
createRouter.get('/scrape/teams', handleAppRequest(handleScrapeTeamsGet));
createRouter.get('/scrape/meetings', handleAppRequest(handleScrapeMeetingsGet));
createRouter.post('/scrape/meeting', handleAppRequest(handleScrapeMeetingPost));

export default createRouter;
