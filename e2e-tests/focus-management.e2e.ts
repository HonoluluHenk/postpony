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

  test('should keep focus on the votable switch after toggling', async ({page, checkA11y}) => {
    const {editPage} = await EditPage.createSession(page, ['2026-03-05T20:00', '2026-03-07T18:00']);

    await editPage.toggleVotable(1);

    await expect(editPage.votableCheckbox(1)).toBeFocused();
    await checkA11y();
  });

  test('should move focus to the section heading after confirming a date', async ({page, checkA11y}) => {
    const {editPage} = await EditPage.createSession(page, ['2026-03-05T20:00', '2026-03-07T18:00']);

    await editPage.confirmDate(1);

    await expect(page.locator('#proposed-dates-management h3')).toBeFocused();
    await checkA11y();
  });

  test('should move focus to the section heading after deleting a row', async ({page, checkA11y}) => {
    const {editPage} = await EditPage.createSession(page, ['2026-03-05T20:00', '2026-03-07T18:00']);

    await editPage.deleteProposedDate(1);

    await expect(page.locator('#proposed-dates-management h3')).toBeFocused();
    await checkA11y();
  });

  test('should not scroll the page when toggling the votable switch', async ({page, checkA11y}) => {
    await page.setViewportSize({width: 1024, height: 600});
    const {editPage} = await EditPage.createSession(page, [
      '2026-03-05T20:00',
      '2026-03-06T18:00',
      '2026-03-07T18:00',
      '2026-03-08T18:00',
      '2026-03-09T18:00',
    ]);

    const lastRow = editPage.proposedDateRows.nth(4);
    await lastRow.scrollIntoViewIfNeeded();
    const scrollYBefore = await page.evaluate(() => window.scrollY);
    expect(scrollYBefore).toBeGreaterThan(0);

    await editPage.toggleVotable(4);

    await expect(editPage.votableCheckbox(4)).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollYBefore);
    await checkA11y();
  });
});
