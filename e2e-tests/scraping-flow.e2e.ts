import { expect, test } from './fixtures';

/**
 * Drives the full click-tt.ch scraping drilldown (leagues → groups → teams →
 * meetings → create) end-to-end. The server is started with
 * `APP_CLICK_TT_FIXTURES_DIR` (see playwright.config.ts), so every scrape step is
 * served from the downloaded HTML fixtures in `src/lib/__fixtures__` instead of
 * the live site, keeping the test deterministic and offline.
 *
 * Because the fixtures are deterministic, the assertions check for the concrete
 * values they contain (league/group/team names and individual meeting rows)
 * rather than just generic shapes or counts.
 */
test.describe('Scraping Flow', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/create/scrape');
  });

  test('should list the concrete leagues from the start-page fixture', async ({page}) => {
    await expect(page.getByRole('heading', {name: 'Choose your league', level: 2}))
      .toBeVisible();

    // Concrete leagues from leagues.html.
    await expect(page.getByRole('link', {name: 'MTTV 2026/27'}))
      .toBeVisible();
    await expect(page.getByRole('link', {name: 'Nationalliga 2026/27'}))
      .toBeVisible();

    // The fixture lists exactly 12 leagues.
    await expect(page.getByRole('listitem'))
      .toHaveCount(12);
  });

  test('should drill down through league, group, team and create a postponement', async ({page}) => {
    // 1. Leagues → pick a league
    await page.getByRole('link', {name: 'MTTV 2026/27'})
      .click();

    // 2. Groups → concrete groups from groups.html, then pick one
    await expect(page.getByRole('heading', {name: 'Choose your group', level: 2}))
      .toBeVisible();
    await expect(page.getByRole('link', {name: 'HE 1. Liga', exact: true}))
      .toBeVisible();
    await expect(page.getByRole('link', {name: 'HE 2. Liga Gr. 1', exact: true}))
      .toBeVisible();
    // The league-page fixture lists exactly 23 groups.
    await expect(page.getByRole('listitem'))
      .toHaveCount(23);
    await page.getByRole('link', {name: 'O40 1. Liga', exact: true})
      .click();

    // 3. Teams → concrete teams from group.html, then pick one
    await expect(page.getByRole('heading', {name: 'Choose your team', level: 2}))
      .toBeVisible();
    for (const team of
      [
        'Thun', 'Port', 'Burgdorf', 'Heimberg', 'Aarberg',
        'Solothurn', 'Bern', 'Ostermundigen',
      ])
    {
      await expect(page.getByRole('link', {name: team, exact: true}))
        .toBeVisible();
    }
    // The group-page fixture lists exactly 8 teams.
    await expect(page.getByRole('listitem'))
      .toHaveCount(8);
    await page.getByRole('link', {name: 'Ostermundigen', exact: true})
      .click();

    // 4. Meetings → concrete rows from team.html
    await expect(page.getByRole('heading', {name: 'Choose the match to reschedule', level: 2}))
      .toBeVisible();
    // The action column has an accessible (visually-hidden) header.
    await expect(page.getByRole('columnheader', {name: 'Actions'}))
      .toBeAttached();
    // header row + 14 meeting rows (7 first-half + 7 second-half).
    await expect(page.getByRole('row'))
      .toHaveCount(15);

    // Concrete meetings from the team-page fixture (matched by their date,
    // which uniquely identifies each leg of the schedule).
    const firstMeeting = page.getByRole('row')
      .filter({hasText: '29.08.2026'});
    await expect(firstMeeting)
      .toContainText('16:00');
    await expect(firstMeeting)
      .toContainText('Thun');
    await expect(firstMeeting)
      .toContainText('Ostermundigen');

    const returnMeeting = page.getByRole('row')
      .filter({hasText: '14.01.2027'});
    await expect(returnMeeting)
      .toContainText('Ostermundigen');
    await expect(returnMeeting)
      .toContainText('Thun');

    // 5. Create a postponement from the first meeting
    await Promise.all([
      page.waitForURL(/\/edit\/.+/),
      page.getByRole('button', {name: 'Create Postponement for this match'})
        .first()
        .click(),
    ]);

    // 6. We land on the edit screen for the scraped match
    await expect(page.getByRole('heading', {name: 'Editing Postponement', level: 1}))
      .toBeVisible();
    await expect(page.getByText('Status:'))
      .toContainText('Draft');

    // 7. The proposed-date field defaults to the original match's date/time.
    await expect(page.getByLabel('Proposed Date & Time'))
      .toHaveValue('2026-08-29T16:00');
  });

  test('should navigate back from groups to leagues', async ({page}) => {
    await page.getByRole('link', {name: 'MTTV 2026/27'})
      .click();
    await expect(page.getByRole('heading', {name: 'Choose your group', level: 2}))
      .toBeVisible();

    await page.getByRole('link', {name: 'Back'})
      .click();
    await expect(page.getByRole('heading', {name: 'Choose your league', level: 2}))
      .toBeVisible();
  });

  test('should not have any automatically detectable accessibility violations', async ({checkA11y}) => {
    await checkA11y();
  });
});
