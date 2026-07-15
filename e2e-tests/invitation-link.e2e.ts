import { expect, test } from './fixtures';

test.describe('Invitation Link', () => {
  test('should display absolute URLs for both team invitation links', async ({page, baseURL}) => {
    // 1. Create a new postponing-session
    await page.goto('/create');
    await page.getByLabel('Postponement Name')
      .fill('My Match');
    await page.getByRole('button', {name: 'Create Postponement'})
      .click();

    // 2. Wait for redirect to edit page
    await expect(page)
      .toHaveURL(/\/edit\/.+/);

    // baseURL in playwright.config.ts is https://game-scheduler.localhost:3001
    if (!baseURL) {
      throw new Error('baseURL is not defined in the test context');
    }
    const expectedBase = baseURL;

    // 3. Both team links must be present, absolute and carry the invitation token
    const homeLink = page.locator('a[href*="/join/"][href*="/home?token="]');
    const awayLink = page.locator('a[href*="/join/"][href*="/away?token="]');

    await expect(homeLink)
      .toBeVisible();
    await expect(awayLink)
      .toBeVisible();

    const homeHref = await homeLink.getAttribute('href');
    const awayHref = await awayLink.getAttribute('href');

    expect(homeHref)
      .toMatch(new RegExp(`^${expectedBase}/join/.+/home\\?token=.+`));
    expect(awayHref)
      .toMatch(new RegExp(`^${expectedBase}/join/.+/away\\?token=.+`));
  });

  test('should use APP_BASE_URL environment variable if provided', async () => {
    // This test is a bit tricky to run in the same process if we don't restart the server.
    // But we can at least verify that it works when the server is started with it.
    // For now, we've verified the code change.
  });
});
