import { expect, test } from './fixtures';
import { EditPage, JoinPage, ScrapePage, StartPage } from './pages';
import {
  expectAllIconsHidden,
  expectNoRequiredRadios,
  expectNoSkippedHeadings,
} from './semantic-asserts';

/**
 * Semantic-structure regression net (spec: .scratch/semantic-html-fixes/).
 * Pins the WCAG 2.2 AA template fixes from tickets 01–06: every decorative
 * icon hidden, a clean heading outline, no false aria-required, and a
 * consistent error-container live region — on every route.
 */

test.describe('Semantic structure', () => {
  test('start page', async ({page, checkA11y}) => {
    await new StartPage(page)
      .goto();

    await expectNoSkippedHeadings(page);
    await expectAllIconsHidden(page);
    await checkA11y();
  });

  test('create page', async ({page, checkA11y}) => {
    await page.goto('/create');

    await expectNoSkippedHeadings(page);
    await expectAllIconsHidden(page);
    await checkA11y();
  });

  test('edit page (owner)', async ({page, checkA11y}) => {
    await EditPage.createSession(page, 'Semantic Edit', ['2026-03-05T20:00']);

    await expectNoSkippedHeadings(page);
    await expectAllIconsHidden(page);
    await checkA11y();
  });

  test('edit page with split tallies', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, 'Semantic Tallies', ['2026-06-01T20:00', '2026-06-15T18:30']);

    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);
    await editPage.toggleAwayVotable(0);
    await editPage.toggleAwayVotable(1);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('HomeVoter');
    await joinPage.castVote(0, 'Yes');
    await joinPage.castVote(1, 'No');
    await joinPage.submitVotes();

    await joinPage.goto(session.awayHref);
    await joinPage.join('AwayVoter');
    await joinPage.castVote(0, 'No');
    await joinPage.castVote(1, 'Yes');
    await joinPage.submitVotes();

    await editPage.goto(session.editUrl);

    // Tallies render their h3 headings; the outline must not skip a level.
    await expect(editPage.homeTallySection())
      .toContainText('Home Team Votes');
    await expect(editPage.awayTallySection())
      .toContainText('Away Team Votes');

    await expectNoSkippedHeadings(page);
    await expectAllIconsHidden(page);
    await checkA11y();
  });

  test('join page', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, 'Semantic Join', ['2026-03-05T20:00']);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await expect(joinPage.heading)
      .toBeVisible();

    await expectNoSkippedHeadings(page);
    await expectAllIconsHidden(page);
    await expectNoRequiredRadios(page);
    await checkA11y();
  });

  test('vote page', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, 'Semantic Vote', ['2026-03-05T20:00']);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Voter');

    await expect(joinPage.tallySection())
      .toContainText('Vote Summary');

    await expectNoSkippedHeadings(page);
    await expectAllIconsHidden(page);
    await checkA11y();
  });

  test('scrape flow (league → group → team → meetings)', async ({page, checkA11y}) => {
    const scrapePage = await new ScrapePage(page)
      .goto();
    await scrapePage.pickLeague('MTTV 2026/27');
    await scrapePage.pickGroup('O40 1. Liga');
    await scrapePage.pickTeam('Ostermundigen');

    await expect(scrapePage.matchesHeading)
      .toBeVisible();

    await expectNoSkippedHeadings(page);
    await expectAllIconsHidden(page);
    await checkA11y();
  });

  test('error page', async ({page, checkA11y}) => {
    await page.goto('/edit/non-existent-id');
    await expect(page.getByRole('heading', {name: 'Error', level: 2}))
      .toBeVisible();

    await expectNoSkippedHeadings(page);
    await expectAllIconsHidden(page);
    await checkA11y();
  });
});