import { expect, test } from './fixtures';
import { EditPage, JoinPage, ScrapePage } from './pages';

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

    // 3. A second, clean date: no scheduled game within 10.10.2026 18:00 ± 2h.
    await editPage.addProposedDate('2026-10-10T18:00');
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();
    await expect(editPage.proposedDateList.getByText('Schedule checked, no clashes'))
      .toBeVisible();
    // The clashing date still shows its line after the re-check.
    await expect(editPage.proposedDateList.getByText('Home: 7:30 PM vs Burgdorf'))
      .toBeVisible();

    // 4. The manual refresh action exists and keeps the same snapshot.
    await expect(page.getByRole('button', {name: 'Refresh schedule check'}))
      .toBeVisible();

    // 5. Make both dates votable so the opponent (the scraped organizer team,
    // away) sees them on the vote page.
    await editPage.toggleVotableByOpponent(0);
    await editPage.toggleVotableByOpponent(1);

    // 6. Vote page shows the same clash info as the edit page.
    const {awayHref} = await editPage.getInviteLinks();
    const joinPage = await new JoinPage(page)
      .goto(awayHref);
    await joinPage.join('Clash Watcher');
    await expect(joinPage.voteForm.getByText('Home: 7:30 PM vs Burgdorf'))
      .toBeVisible();
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
    await editPage.toggleVotableByOpponent(0);
    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Manual Watcher');
    await expect(joinPage.voteForm.getByText('Not checked'))
      .toBeVisible();

    await checkA11y();
  });
});
