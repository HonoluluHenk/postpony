import type { Locator } from '@playwright/test';
import { expect, test } from './fixtures';
import { EditPage } from './pages';

const PHONE_VIEWPORT = {width: 375, height: 667};

// Asserts the element's full bounding box lies inside the viewport, i.e. it is
// not clipped at the page edge. scrollIntoViewIfNeeded handles vertical page
// scroll (e.g. after an HTMX swap focuses a section further down the page).
async function expectFullyInViewport(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const fullyVisible = await locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return rect.left >= 0
      && rect.top >= 0
      && rect.right <= window.innerWidth
      && rect.bottom <= window.innerHeight;
  });
  expect(fullyVisible)
    .toBe(true);
}

test.describe('Responsive Layout', () => {
  test('phone viewport: no horizontal overflow, wrapped header, stacked tables, reachable invite links', async ({page}) => {
    await page.setViewportSize(PHONE_VIEWPORT);
    const {editPage} = await EditPage.createSession(page, ['2026-03-05T20:00']);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });

    // No horizontal page overflow: nothing is clipped at the page edge.
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    // Header reflows below 600px: the page title wraps onto its own line
    // instead of being clipped between the logo and the language buttons.
    await expect(editPage.heading)
      .toBeVisible();
    const logoBox = await page.getByAltText('PostPony')
      .boundingBox();
    const titleBox = await editPage.heading.boundingBox();
    if (!logoBox || !titleBox) {
      throw new Error('header logo or title has no bounding box');
    }
    expect(titleBox.y)
      .toBeGreaterThan(logoBox.y);

    // Vote-tally table stacks below 993px: cells are block-level and the
    // header row is visually hidden (clip pattern) while keeping real
    // table semantics for screen readers.
    const table = editPage.homeTallyTable();
    await expect(table.locator('thead'))
      .toHaveCSS('position', 'absolute');
    await expect(table.locator('tbody tr td')
      .first())
      .toHaveCSS('display', 'block');

    // Invitation links wrap and stay reachable; copy buttons are clickable.
    await expectFullyInViewport(editPage.homeInviteLink);
    await expectFullyInViewport(editPage.awayInviteLink);
    await expectFullyInViewport(editPage.homeCopyButton());
    await expectFullyInViewport(editPage.awayCopyButton());
    await expect(editPage.homeCopyButton())
      .toBeEnabled();
    await expect(editPage.awayCopyButton())
      .toBeEnabled();

    // The proposed-dates table stays a real table on phones (no card-stacking):
    // its thead keeps a static position and the `.scroll` wrapper pans
    // sideways, so the "Votable" switch stays reachable.
    await expect(editPage.proposedDateList.locator('thead'))
      .not
      .toHaveCSS('position', 'absolute');
    await expectFullyInViewport(editPage.votableToggle(0));
  });

  test('desktop viewport: container caps at 1200px', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await EditPage.createSession(page);

    await expect(page.locator('.container')
      .first())
      .toHaveCSS('max-width', '1200px');
  });

  test('phone viewport: stacked-table page stays accessible', async ({page, checkA11y}) => {
    await page.setViewportSize(PHONE_VIEWPORT);
    await EditPage.createSession(page, ['2026-03-05T20:00']);

    await checkA11y();
  });
});
