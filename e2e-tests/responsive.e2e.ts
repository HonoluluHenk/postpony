import type { Locator } from '@playwright/test';
import { expect, test } from './fixtures';
import { EditPage } from './pages';
import { setViewport } from './viewports';

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

// Asserts the child's bounding box lies entirely within the parent's, i.e. the
// child is not clipped by an ancestor's overflow. This catches the date-card
// bug where a fixed height plus overflow:hidden on the details row cut off the
// chips.
async function expectFullyWithin(parent: Locator, child: Locator): Promise<void> {
  const childBox = await child.boundingBox();
  const parentBox = await parent.boundingBox();
  if (!childBox || !parentBox) {
    throw new Error('element has no bounding box');
  }
  expect(childBox.x)
    .toBeGreaterThanOrEqual(parentBox.x);
  expect(childBox.y)
    .toBeGreaterThanOrEqual(parentBox.y);
  expect(childBox.x + childBox.width)
    .toBeLessThanOrEqual(parentBox.x + parentBox.width);
  expect(childBox.y + childBox.height)
    .toBeLessThanOrEqual(parentBox.y + parentBox.height);
}

// Asserts the element renders its full text without horizontal truncation
// (scrollWidth <= clientWidth). A nowrap/ellipsis style hides the overflowing
// text, making scrollWidth exceed clientWidth.
async function expectNotHorizontallyTruncated(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const notTruncated = await locator.evaluate((el) => el.scrollWidth <= el.clientWidth);
  expect(notTruncated)
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

    // The proposed-dates list is a flex column of cards (not a table), so
    // it wraps naturally on phones. The votable toggle stays reachable.
    await expect(editPage.votableToggle(0))
      .toBeVisible();
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

// Ticket 03: the own-team Votes table must stack on a phone so the rightmost
// "Voted" column is not cut off at the viewport edge. The stacked-table pattern
// keys off `td[data-label]` cells, and the voted cell is the rightmost body cell
// of the first data row, so its bounding box must lie fully inside the viewport.
// The no-horizontal-overflow guard prevents `scrollIntoViewIfNeeded` from
// masking a pre-fix cut-off column by scrolling it into view.
test.describe('Own-team votes table stacking', () => {
  test('phone viewport: the voted cell of the first row is fully inside the viewport', async ({page, checkA11y}) => {
    await setViewport(page, 'phone');
    const {editPage, session} = await EditPage.createSession(page, ['2026-03-05T20:00']);
    // The own-team Votes section is part of the full-page template, not of the
    // partial that adds a date (its out-of-band swap needs an existing
    // `#own-team-votes` node), so reload to read the stacked table.
    await page.goto(session.editUrl);

    const ownTeamTable = editPage.ownTeamTable();
    const firstRowVotedCell = ownTeamTable.getByRole('row')
      .nth(1)
      .getByRole('cell')
      .last();

    await expect(firstRowVotedCell)
      .toBeVisible();
    await expectFullyInViewport(firstRowVotedCell);

    // The stacked table leaves no horizontal page overflow, so the "Voted"
    // column stays on-screen without any horizontal scrolling.
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    await checkA11y();
  });
});

// Ticket 02: the Proposed Date card must show its full date text and every
// Clash / Venue Occupancy chip on tablet and phone. A clean date sorts first
// (both check chips) and a clashing date follows (clash chip), so one session
// covers both states.
test.describe('Proposed date card full visibility', () => {
  for (const name of ['tablet', 'phone'] as const) {
    test(`proposed date card shows the full date and all chips at the ${name} viewport`, async ({page, checkA11y}) => {
      await setViewport(page, name);
      const {editPage} = await EditPage.createSession(page, ['2026-10-10T18:00', '2026-12-04T18:00']);

      // Full date text of the first Proposed Date is visible, not truncated to
      // an ellipsis and not clipped at the card edge.
      const firstCard = editPage.proposedDateRows.nth(0);
      const dateText = firstCard.locator('.proposed-date-info > .max');
      await expect(dateText)
        .toBeVisible();
      await expectNotHorizontallyTruncated(dateText);
      await expectFullyWithin(firstCard, dateText);

      // Both check chips stay on the clean row.
      const cleanDetails = firstCard.locator('.proposed-date-details');
      const cleanChip = cleanDetails.getByText('Schedule checked, no clashes');
      const venueChip = cleanDetails.getByText('Venue checked, no other games');
      await expect(cleanChip)
        .toBeVisible();
      await expect(venueChip)
        .toBeVisible();
      await expectFullyWithin(firstCard, cleanChip);
      await expectFullyWithin(firstCard, venueChip);

      // The clashing date's chip is visible on its row too.
      const clashCard = editPage.proposedDateRows.nth(1);
      await expect(clashCard)
        .toHaveClass(/clash-row/);
      const clashChip = clashCard.locator('.proposed-date-details')
        .getByText(/vs Burgdorf/);
      await expect(clashChip)
        .toBeVisible();
      await expectFullyWithin(clashCard, clashChip);

      await checkA11y();
    });
  }
});

// Ticket 04: the invitation link row must not wrap — the copy-to-clipboard
// button sits in the same vertical band as its link, and nothing overflows the
// phone viewport. A wrapping row would push the icon onto its own line.
test.describe('Invitation link row on phone', () => {
  test('clipboard button shares its link vertical band and nothing overflows the viewport', async ({page, checkA11y}) => {
    await setViewport(page, 'phone');
    const {editPage} = await EditPage.createSession(page);

    for (const [link, copyBtn] of [
      [editPage.homeInviteLink, editPage.homeCopyButton()],
      [editPage.awayInviteLink, editPage.awayCopyButton()],
    ] as const) {
      // Both controls stay fully inside the phone viewport.
      await expectFullyInViewport(link);
      await expectFullyInViewport(copyBtn);

      // The copy button vertically overlaps its link's band, i.e. they share
      // one line instead of the button wrapping below the link.
      const linkBox = await link.boundingBox();
      const copyBox = await copyBtn.boundingBox();
      if (!linkBox || !copyBox) {
        throw new Error('invite link or copy button has no bounding box');
      }
      const sameBand = copyBox.y < linkBox.y + linkBox.height
        && linkBox.y < copyBox.y + copyBox.height;
      expect(sameBand)
        .toBe(true);
    }

    // No horizontal page overflow: the nowrap link row must not push the
    // copy button (or the page) past the viewport edge.
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    await checkA11y();
  });
});
