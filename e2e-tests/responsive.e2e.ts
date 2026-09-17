import type { Locator } from '@playwright/test';
import { expect, test } from './fixtures';
import { EditPage, OpponentPage } from './pages';
import { setViewport, viewportNames } from './viewports';

const PHONE_VIEWPORT = {width: 375, height: 667};

// Asserts the element's full bounding box lies inside the viewport, i.e. it is
// not clipped at the page edge. scrollIntoView handles vertical page scroll
// (e.g. after an HTMX swap focuses a section further down the page) and
// centers the element so a sub-pixel boundary doesn't leave a sliver outside
// the viewport bottom.
async function expectFullyInViewport(locator: Locator): Promise<void> {
  await locator.evaluate((el) => {
    el.scrollIntoView({block: 'center', inline: 'nearest'});
  });
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
// child is not clipped by an ancestor's overflow.
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
// text, making scrollWidth exceed clientWidth. Polls so the layout can settle
// (fonts, HTMX swap) before the check runs.
async function expectNotHorizontallyTruncated(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await expect.poll(async () => locator.evaluate((el) => el.scrollWidth <= el.clientWidth))
    .toBe(true);
}

test.describe('Responsive Layout', () => {
  test('phone viewport: no horizontal overflow, wrapped header, vote dots, reachable invite links', async ({page}) => {
    await page.setViewportSize(PHONE_VIEWPORT);
    const {editPage, session} = await EditPage.createSession(page, ['2026-03-05T20:00']);
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

    // The vote-dot count renders inline and is not clipped on phones.
    await expect(editPage.voteDotCount(0))
      .toBeVisible();
    await expectFullyInViewport(editPage.voteDotCount(0));

    // Invitation links wrap and stay reachable; copy buttons are clickable.
    await expectFullyInViewport(editPage.homeInviteLink);
    await expectFullyInViewport(editPage.homeCopyButton());
    await expect(editPage.homeCopyButton())
      .toBeEnabled();

    // The opponent captain's own team-invite link stays reachable on his page
    // at the phone width; return to the editor afterwards.
    const opponentPage = await new OpponentPage(page)
      .goto(session.opponentCaptainHref);
    await expectFullyInViewport(opponentPage.teamInviteLink);
    await expectFullyInViewport(opponentPage.teamInviteCopyButton);
    await expect(opponentPage.teamInviteCopyButton)
      .toBeEnabled();
    await editPage.goto(session.editUrl);

    // The week rail sits above the sidebar and the votable toggle stays reachable.
    await expect(editPage.votableToggle(0))
      .toBeVisible();
    await expectFullyInViewport(editPage.votableToggle(0));

    // The roster/generator side-details collapse on phones so the rail is the
    // first thing the organizer sees.
    const sideDetails = page.locator('.edit-redesign details.side-details');
    await expect(sideDetails)
      .toHaveCount(2);
    await expect(sideDetails.first())
      .not
      .toHaveAttribute('open');
    await expect(sideDetails.nth(1))
      .not
      .toHaveAttribute('open');
  });

  test('desktop viewport: container caps at 1200px', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await EditPage.createSession(page);

    await expect(page.locator('.container')
      .first())
      .toHaveCSS('max-width', '1200px');
  });

  test('phone viewport: vote-dot page stays accessible', async ({page, checkA11y}) => {
    await page.setViewportSize(PHONE_VIEWPORT);
    await EditPage.createSession(page, ['2026-03-05T20:00']);

    await checkA11y();
  });
});

// The edit page renders the redesigned week rail + sticky sidebar at every
// breakpoint; nothing may push the page wider than the viewport.
test.describe('Edit page horizontal overflow', () => {
  for (const name of viewportNames) {
    test(`edit page has no horizontal overflow at the ${name} viewport`, async ({page, checkA11y}) => {
      await setViewport(page, name);
      await EditPage.createSession(page, ['2026-03-05T20:00', '2026-03-12T18:30']);

      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);

      await checkA11y();
    });
  }
});

// The vote-dot count is the inline "N/M voted" indicator in each date row. On a
// phone it must stay fully inside the viewport — a horizontal cut-off here means
// the rail overflows the layout.
test.describe('Vote-dot count on phone', () => {
  test('phone viewport: the vote-dot count of the first row is fully inside the viewport', async ({
                                                                                                    page,
                                                                                                    checkA11y,
                                                                                                  }) => {
    await setViewport(page, 'phone');
    const {editPage} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const count = editPage.voteDotCount(0);
    await expect(count)
      .toBeVisible();
    await expectFullyInViewport(count);

    // No horizontal page overflow, so the count stays on-screen without any
    // horizontal scrolling.
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    await checkA11y();
  });
});

// A clean date sorts first (both check chips) and a clashing date follows
// (clash chip), so one session covers both chip states.
test.describe('Proposed date row full visibility', () => {
  for (const name of ['tablet', 'phone'] as const) {
    test(`proposed date row shows the full date and all chips at the ${name} viewport`, async ({page, checkA11y}) => {
      await setViewport(page, name);
      const {editPage} = await EditPage.createSession(page, ['2026-10-10T18:00', '2026-12-04T18:00']);

      // Full date text of the first Proposed Date is visible, not truncated to
      // an ellipsis and not clipped at the row edge.
      const firstRow = editPage.proposedDateRows.nth(0);
      const dateCell = firstRow.locator('.date-cell');
      await expect(dateCell)
        .toBeVisible();
      await expectNotHorizontallyTruncated(dateCell);
      await expectFullyWithin(firstRow, dateCell);

      // Both check chips stay on the clean row.
      const cleanChip = firstRow.locator('.chip--clean', {hasText: 'No other games'});
      const venueChip = firstRow.locator('.chip--clean', {hasText: 'Venue empty'});
      await expect(cleanChip)
        .toBeVisible();
      await expect(venueChip)
        .toBeVisible();
      await expectFullyWithin(firstRow, cleanChip);
      await expectFullyWithin(firstRow, venueChip);

      // The clashing date's error chip is visible on its row too.
      const clashRow = editPage.proposedDateRows.nth(1);
      await expect(clashRow)
        .toHaveClass(/clash-row/);
      await expect(clashRow.locator('.chip--error'))
        .toBeVisible();
      await expectFullyWithin(clashRow, clashRow.locator('.chip--error'));

      await checkA11y();
    });
  }
});

// The invitation link row must not push the copy-to-clipboard button (or the
// page) past the phone viewport edge. The redesign lets the link text wrap and
// the copy icon drop onto its own line, so the invariant is reachability + no
// horizontal overflow rather than a shared vertical band.
test.describe('Invitation link row on phone', () => {
  test('copy buttons stay reachable and nothing overflows the viewport', async ({page, checkA11y}) => {
    await setViewport(page, 'phone');
    const {editPage} = await EditPage.createSession(page);

    for (const linkAndBtn of [
      [editPage.homeInviteLink, editPage.homeCopyButton()],
    ] as const)
    {
      const [link, copyBtn] = linkAndBtn;
      // Both controls stay fully inside the phone viewport.
      await expectFullyInViewport(link);
      await expectFullyInViewport(copyBtn);
      await expect(copyBtn)
        .toBeEnabled();
    }

    // No horizontal page overflow: the nowrap link row must not push the
    // copy button (or the page) past the viewport edge.
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    await checkA11y();
  });
});
