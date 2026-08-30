import { expect, test } from './fixtures';
import { EditPage, JoinPage, ScrapePage } from './pages';
import { isoToLocaleTokens } from './pages/locale-tokens';

/**
 * Full-flow tests for the schedule clash feature (issue 07): a scrape-created
 * match shows clash lines and the clean-check state on both the edit and the
 * vote page; a hand-entered match shows "not checked" on both pages.
 *
 * The failed-schedule-check degradation (a scrape error must never block
 * adding dates) is NOT covered here: the Playwright webServer env
 * (playwright.config.ts) pins APP_CLICK_TT_FIXTURES_DIR to the complete
 * fixtures dir, and per-test env overrides of the webServer do not exist in
 * Playwright — so no request can ever hit a missing fixture file in this
 * suite. The degradation is covered by handler-level unit tests instead
 * (edit-handlers.spec.ts: "a failed scrape leaves the date clash-free but
 * still saves and renders").
 */
test.describe('Clash checks', () => {
  test('scrape-created match shows clash lines and the clean state on edit and vote pages', async ({page, checkA11y}) => {
    // 1. Scrape the Thun vs Ostermundigen match (fixture mode) — organizer
    // claims the guest side (Ostermundigen), Thun keeps the home side.
    const scrapePage = await new ScrapePage(page)
      .goto();
    await scrapePage.pickLeague('MTTV 2026/27');
    await scrapePage.pickGroup('O40 1. Liga');
    await scrapePage.pickTeam('Ostermundigen');
    await Promise.all([
      page.waitForURL(/\/edit\/.+/),
      scrapePage.selectButton('29.08.2026')
        .click(),
    ]);

    // 2. Propose a date that clashes with a Thun home game: Burgdorf vs Thun
    // plays on 04.12.2026 at 19:30, inside the proposed 18:00 ± 2h window.
    // The check scrapes both teams' schedules (team.html / team-thun.html).
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-12-04T18:00');
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();
    await expect(editPage.proposedDateList.getByText('Home: 7:30 PM vs Burgdorf'))
      .toBeVisible();
    // Auto-deselected: the clashing date stays in the list with its clash chip
    // but its votable switch is off.
    await expect(editPage.votableCheckbox(0))
      .not
      .toBeChecked();

    // 3. A second, clean date: no scheduled game within 10.10.2026 18:00 ± 2h.
    await editPage.addProposedDate('2026-10-10T18:00');
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();
    await expect(editPage.proposedDateList.getByText('Schedule checked, no clashes'))
      .toBeVisible();
    // Rows sort chronologically: the clean date (10 Oct) leads and stays
    // votable, the clashing date (4 Dec) follows and stays deselected.
    await expect(editPage.votableCheckbox(0))
      .toBeChecked();
    await expect(editPage.votableCheckbox(1))
      .not
      .toBeChecked();
    // The clashing date still shows its line after the re-check.
    await expect(editPage.proposedDateList.getByText('Home: 7:30 PM vs Burgdorf'))
      .toBeVisible();

    // 4. The manual refresh action exists and keeps the same snapshot.
    await expect(page.getByRole('button', {name: 'Refresh schedule check'}))
      .toBeVisible();

    // 5. Only votable dates reach the polls: the organizer's auto-deselect
    // keeps the clashing date off the opponent's vote page, while the clean
    // date is shown.

    // 6. Vote page shows the clean date's clash info; the clashing date is
    // hidden from the poll entirely.
    const {awayHref} = await editPage.getInviteLinks();
    const joinPage = await new JoinPage(page)
      .goto(awayHref);
    await joinPage.join('Clash Watcher');
    await expect(joinPage.voteForm.getByText('Home: 7:30 PM vs Burgdorf'))
      .toHaveCount(0);
    await expect(joinPage.voteForm.getByText('Schedule checked, no clashes'))
      .toBeVisible();

    await checkA11y();
  });

  test('hand-entered match shows "not checked" on edit and vote pages', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    // Hand-entered matches carry no click-tt identities, so the date is
    // rendered "not checked" and no refresh action is offered.
    const editPage = new EditPage(page);
    await expect(editPage.proposedDateList.getByText('Not checked'))
      .toBeVisible();
    await expect(page.getByRole('button', {name: 'Refresh schedule check'}))
      .toHaveCount(0);

    // The vote page mirrors the "not checked" state.
    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Manual Watcher');
    await expect(joinPage.voteForm.getByText('Not checked'))
      .toBeVisible();

    await checkA11y();
  });

  test('scrape-created match shows the venue occupancy count on the edit page', async ({page, checkA11y}) => {
    // 1. Scrape the return match (14.01.2027) where Ostermundigen is the home
    // team: the session then carries Ostermundigen's real club id (33282), so
    // the occupancy check fires against the club-meetings fixture.
    const scrapePage = await new ScrapePage(page)
      .goto();
    await scrapePage.pickLeague('MTTV 2026/27');
    await scrapePage.pickGroup('O40 1. Liga');
    await scrapePage.pickTeam('Ostermundigen');
    await Promise.all([
      page.waitForURL(/\/edit\/.+/),
      scrapePage.selectButton('14.01.2027')
        .click(),
    ]);

    // 2. Propose a date that overlaps one of the club's other home meetings at
    // the selected venue: the club-meetings fixture has Ostermundigen vs Port
    // on 30.03.2027 20:15 at venue 3, inside the proposed 20:00 ± 2h window.
    const editPage = new EditPage(page);
    const lang = await page.locator('html')
      .getAttribute('lang');
    await editPage.proposedDateTimeInput.fill(isoToLocaleTokens(lang, '2027-03-30T20:00'));
    await page.locator('#venueNumber')
      .selectOption('3');
    await editPage.addProposedDateButton.click();

    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();
    // The occupancy count renders per proposed date alongside the clash lines.
    await expect(editPage.proposedDateList.getByText('1 other games at this venue'))
      .toBeVisible();
    // Hovering the count reveals the conflicting match (opponent + time) in an
    // accessible tooltip: the club-meetings fixture has Ostermundigen vs Port.
    const occupancyTrigger = editPage.proposedDateList
      .getByRole('button', {name: '1 other games at this venue'});
    await occupancyTrigger.hover();
    await expect(page.getByRole('tooltip'))
      .toContainText('Port');
    await expect(page.getByRole('tooltip'))
      .toContainText('8:15 PM');

    // 3. The participant poll mirrors the same snapshot: join the session and
    // see the occupancy count on the proposed date in the vote form.
    const {homeHref} = await editPage.getInviteLinks();
    const joinPage = await new JoinPage(page)
      .goto(homeHref);
    await joinPage.join('Occupancy Watcher');
    await expect(joinPage.voteForm.getByText('1 other games at this venue'))
      .toBeVisible();
    // The vote page's occupancy count reveals the same conflicting match.
    const joinOccupancyTrigger = joinPage.voteForm
      .getByRole('button', {name: '1 other games at this venue'});
    await joinOccupancyTrigger.hover();
    await expect(joinPage.voteForm.getByRole('tooltip'))
      .toContainText('Port');

    await checkA11y();
  });
});
