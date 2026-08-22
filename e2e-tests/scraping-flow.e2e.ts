import { expect, test } from './fixtures';
import { EditPage, ScrapePage } from './pages';

/**
 * Drives the full click-tt.ch scraping drilldown (leagues → groups → teams →
 * matches → create) end-to-end. The server is started with
 * `APP_CLICK_TT_FIXTURES_DIR` (see playwright.config.ts), so every scrape step is
 * served from the downloaded HTML fixtures in `src/lib/__fixtures__` instead of
 * the live site, keeping the test deterministic and offline.
 *
 * Because the fixtures are deterministic, the assertions check for the concrete
 * values they contain (league/group/team names and individual match rows)
 * rather than just generic shapes or counts.
 */
test.describe('Scraping Flow', () => {
  let scrapePage: ScrapePage;

  test.beforeEach(async ({page}) => {
    scrapePage = await new ScrapePage(page)
      .goto();
  });

  test('should list the concrete leagues from the start-page fixture', async ({checkA11y}) => {
    await expect(scrapePage.heading)
      .toBeVisible();

    // Concrete leagues from leagues.html.
    await expect(scrapePage.leagueLink('MTTV 2026/27'))
      .toBeVisible();
    await expect(scrapePage.leagueLink('Nationalliga 2026/27'))
      .toBeVisible();

    // The fixture lists exactly 12 leagues.
    await expect(scrapePage.listItems)
      .toHaveCount(12);

    await checkA11y();
  });

  test('should drill down through league, group, team and create a postponement', async ({page, checkA11y}) => {
    // 1. Leagues → pick a league
    await scrapePage.pickLeague('MTTV 2026/27');

    // 2. Groups → concrete groups from groups.html, then pick one
    await expect(scrapePage.groupsHeading)
      .toBeVisible();
    await expect(scrapePage.groupLink('HE 1. Liga'))
      .toBeVisible();
    await expect(scrapePage.groupLink('HE 2. Liga Gr. 1'))
      .toBeVisible();
    // The league-page fixture lists exactly 23 groups.
    await expect(scrapePage.listItems)
      .toHaveCount(23);
    await scrapePage.pickGroup('O40 1. Liga');

    // 3. Teams → concrete teams from group.html, then pick one
    await expect(scrapePage.teamsHeading)
      .toBeVisible();
    for (const team of
      [
        'Thun', 'Port', 'Burgdorf', 'Heimberg', 'Aarberg',
        'Solothurn', 'Bern', 'Ostermundigen',
      ])
    {
      await expect(scrapePage.teamLink(team))
        .toBeVisible();
    }
    // The group-page fixture lists exactly 8 teams.
    await expect(scrapePage.listItems)
      .toHaveCount(8);
    await scrapePage.pickTeam('Ostermundigen');

    // 4. Matches → concrete rows from team.html
    await expect(scrapePage.matchesHeading)
      .toBeVisible();
    // The action column has an accessible (visually-hidden) header.
    await expect(scrapePage.actionsColumnHeader)
      .toBeAttached();
    // header row + 14 match rows (7 first-half + 7 second-half).
    await expect(scrapePage.matchRows)
      .toHaveCount(15);

    // Concrete matches from the team-page fixture (matched by their date,
    // which uniquely identifies each leg of the schedule).
    const firstMatch = scrapePage.matchRow('29.08.2026');
    await expect(firstMatch)
      .toContainText('16:00');
    await expect(firstMatch)
      .toContainText('Thun');
    await expect(firstMatch)
      .toContainText('Ostermundigen');

    // Each match row shows two create buttons, one per side, labelled with
    // the respective team names.
    await expect(scrapePage.matchRowButtons('29.08.2026'))
      .toHaveCount(2);
    await expect(scrapePage.createButton('Thun', '29.08.2026'))
      .toBeVisible();
    await expect(scrapePage.createButton('Ostermundigen', '29.08.2026'))
      .toBeVisible();

    const returnMatch = scrapePage.matchRow('14.01.2027');
    await expect(returnMatch)
      .toContainText('Ostermundigen');
    await expect(returnMatch)
      .toContainText('Thun');

    // 5. Create a postponement from the first match, claiming the guest side:
    // Ostermundigen (the team picked in step 3) is the guest team against Thun.
    await Promise.all([
      page.waitForURL(/\/edit\/.+/),
      scrapePage.createButton('Ostermundigen', '29.08.2026')
        .click(),
    ]);

    // 6. We land on the edit screen for the scraped match
    const editPage = new EditPage(page);
    await expect(editPage.heading)
      .toBeVisible();
    await expect(editPage.status)
      .toContainText('Draft');

    // 6b. The edit page shows the match summary and no longer offers scraping.
    await expect(editPage.matchSummarySection)
      .toBeVisible();
    await expect(editPage.matchSummarySection)
      .toContainText('Thun vs Ostermundigen');
    await expect(editPage.matchSummarySection)
      .toContainText('08/29/2026 04:00 pm');
    await expect(page.getByRole('link', {name: 'Find your match (click-tt.ch)'}))
      .toHaveCount(0);

    // 7. The proposed-date field defaults to the original match's date/time,
    // rendered in the locale's input tokens (en-US default in e2e).
    await expect(editPage.proposedDateTimeInput)
      .toHaveValue('08/29/2026 04:00 pm');

    // 8. Players scraped from both teams' rosters are prefilled.
    // The scraper navigated for Ostermundigen; in the chosen match
    // (29.08.2026) Ostermundigen is the guest team and Thun is the home team.
    // Ostermundigen uses team.html fixture, Thun uses team-thun.html — each
    // has 3 players → 6 total.
    await expect(editPage.playerItems)
      .toHaveCount(6);
    for (const name of ['Linder, Christoph', 'Schmid, Oliver', 'Milcu, Sasha']) {
      await expect(editPage.playerItem(name))
        .toBeVisible();
    }
    for (const name of ['Nemeth, Philippe-Janos', 'Troxler, Roger', 'Wenger, Markus']) {
      await expect(editPage.playerItem(name))
        .toBeVisible();
    }

    // 9. Claiming the guest side maps to organizerTeam 'away': the organizer's
    // roster (Ostermundigen) is stored as the away team, Thun as the home team.
    await expect(editPage.awayPlayerList)
      .toContainText('Linder, Christoph');
    await expect(editPage.homePlayerList)
      .toContainText('Nemeth, Philippe-Janos');

    await checkA11y();
  });

  test('should create with organizerTeam home when the organizer claims the home side', async ({page, checkA11y}) => {
    await scrapePage.pickLeague('MTTV 2026/27');
    await scrapePage.pickGroup('O40 1. Liga');
    await scrapePage.pickTeam('Ostermundigen');

    await expect(scrapePage.matchesHeading)
      .toBeVisible();
    await expect(scrapePage.matchRowButtons('14.01.2027'))
      .toHaveCount(2);

    // In the return match (14.01.2027) Ostermundigen is the home team, so
    // claiming the Ostermundigen side maps to organizerTeam 'home'.
    await Promise.all([
      page.waitForURL(/\/edit\/.+/),
      scrapePage.createButton('Ostermundigen', '14.01.2027')
        .click(),
    ]);

    const editPage = new EditPage(page);
    await expect(editPage.heading)
      .toBeVisible();
    await expect(editPage.status)
      .toContainText('Draft');

    // Organizer roster (Ostermundigen) is stored as the home team, Thun as the
    // away team.
    await expect(editPage.playerItems)
      .toHaveCount(6);
    await expect(editPage.homePlayerList)
      .toContainText('Linder, Christoph');
    await expect(editPage.awayPlayerList)
      .toContainText('Nemeth, Philippe-Janos');

    await checkA11y();
  });

  test('should navigate back from groups to leagues', async ({checkA11y}) => {
    await scrapePage.pickLeague('MTTV 2026/27');
    await expect(scrapePage.groupsHeading)
      .toBeVisible();

    await scrapePage.clickBack();
    await expect(scrapePage.heading)
      .toBeVisible();

    await checkA11y();
  });

  test('should not have any automatically detectable accessibility violations', async ({checkA11y}) => {
    await checkA11y();
  });
});
