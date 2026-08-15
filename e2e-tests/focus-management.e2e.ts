import { expect, test } from './fixtures';
import { EditPage } from './pages';

test.describe('Focus management after HTMX swaps', () => {
  test('should focus section heading after adding a player', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    await EditPage.createSession(page);
    await editPage.addPlayer('Alice');

    await expect(page.locator('#team-management h3')).toBeFocused();
    await checkA11y();
  });

  test('should focus section heading after adding a proposed date', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    await EditPage.createSession(page);
    await editPage.addProposedDate('2026-03-05T20:00');

    await expect(page.locator('#proposed-dates-management h3')).toBeFocused();
    await checkA11y();
  });

  test('should move focus to heading after boosted navigation', async ({page, checkA11y}) => {
    await page.goto('/');
    await page.getByRole('link', {name: /create/i}).click();
    await page.waitForURL('/create');

    await expect(page.getByRole('heading', {name: /create/i, level: 2})).toBeFocused();
    await checkA11y();
  });
});
