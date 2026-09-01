import { expect, test } from './fixtures';
import { EditPage, ScrapePage, StartPage } from './pages';

test.describe('Postponement Creation', () => {
  let startPage: StartPage;

  test.beforeEach(async ({page}) => {
    startPage = await new StartPage(page)
      .goto();
  });

  test('scrapes a Match, mints a Postponement, and lands on its edit page with a read-only Match summary', async ({page, checkA11y}) => {
    // 1. The start page offers the scrape wizard as the single creation path.
    await expect(startPage.scrapeLink)
      .toBeVisible();

    // 2. Drive the wizard: leagues → groups → teams → matches.
    const scrapePage = await new ScrapePage(page)
      .goto();
    await scrapePage.pickLeague('MTTV 2026/27');
    await scrapePage.pickGroup('O40 1. Liga');
    await scrapePage.pickTeam('Ostermundigen');
    await expect(scrapePage.matchesHeading)
      .toBeVisible();

    // 3. Select the first fixture match (Thun hosts Ostermundigen): a
    // Postponement is minted and we land on its edit page.
    await Promise.all([
      page.waitForURL(/\/edit\/.+/),
      scrapePage.selectButton('29.08.2026')
        .click(),
    ]);
    const editPage = new EditPage(page);

    // 4. The name is derived from the scraped match details in the creator's locale.
    await expect(editPage.heading)
      .toContainText('Editing Postponement');
    await expect(editPage.heading)
      .toContainText('Thun vs Ostermundigen');
    await expect(editPage.heading)
      .toContainText('08/29/2026 04:00 pm');

    // 5. The edit page shows the referenced Match read-only.
    await expect(editPage.matchSummary)
      .toContainText('Match: Thun vs Ostermundigen');
    await expect(editPage.matchSummary)
      .toContainText('08/29/2026 04:00 pm');

    // 6. Verify the organizer password is displayed.
    await expect(editPage.organizerPasswordAlert)
      .toBeVisible();
    const password = await editPage.organizerPassword;
    expect(password)
      .toBeTruthy();
    expect(password?.length)
      .toBeGreaterThan(0);

    // 7. Verify status and invite links.
    await expect(editPage.status)
      .toContainText('Draft');
    await expect(page.getByText('Invite participants using these links'))
      .toBeVisible();

    await checkA11y();
  });

  test('should pass accessibility on start, scrape, and edit pages', async ({page, checkA11y}) => {
    // Start page
    await checkA11y();

    // Scrape wizard (league selection)
    const scrapePage = await new ScrapePage(page)
      .goto();
    await expect(scrapePage.heading)
      .toBeVisible();
    await checkA11y();
    await expect(page)
      .toHaveScreenshot('scrape-leagues.png', {fullPage: true});

    // Drill down and mint, then check the Edit page.
    await scrapePage.pickLeague('MTTV 2026/27');
    await scrapePage.pickGroup('O40 1. Liga');
    await scrapePage.pickTeam('Ostermundigen');
    await expect(scrapePage.matchesHeading)
      .toBeVisible();
    await Promise.all([
      page.waitForURL(/\/edit\/.+/),
      scrapePage.selectButton('29.08.2026')
        .click(),
    ]);
    const editPage = new EditPage(page);
    await expect(editPage.heading)
      .toBeVisible();
    await checkA11y();
  });
});
