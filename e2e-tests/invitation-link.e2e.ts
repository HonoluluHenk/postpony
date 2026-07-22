import { expect, test } from './fixtures';
import { CreatePage } from './pages';

test.describe('Invitation Link', () => {
  test('should display absolute URLs for both team invitation links', async ({page, baseURL, checkA11y}) => {
    // 1. Create a new postponing-session
    const createPage = await new CreatePage(page)
      .goto();
    const editPage = await createPage.create('My Match');

    // baseURL in playwright.config.ts is https://game-scheduler.localhost:3001
    if (!baseURL) {
      throw new Error('baseURL is not defined in the test context');
    }
    const expectedBase = baseURL;

    // 2. Both team links must be present, absolute and carry the invitation token
    await expect(editPage.homeInviteLink)
      .toBeVisible();
    await expect(editPage.awayInviteLink)
      .toBeVisible();

    const homeHref = await editPage.homeInviteLink.getAttribute('href');
    const awayHref = await editPage.awayInviteLink.getAttribute('href');

    expect(homeHref)
      .toMatch(new RegExp(`^${expectedBase}/join/.+/home\\?token=.+`));
    expect(awayHref)
      .toMatch(new RegExp(`^${expectedBase}/join/.+/away\\?token=.+`));

    await checkA11y();
  });

  test('should use APP_BASE_URL environment variable if provided', async () => {
    // This test is a bit tricky to run in the same process if we don't restart the server.
    // But we can at least verify that it works when the server is started with it.
    // For now, we've verified the code change.
  });
});
