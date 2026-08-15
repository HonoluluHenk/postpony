import { expect, test } from './fixtures';
import { CreatePage, StartPage } from './pages';

test.describe('Postponement Creation', () => {
  let startPage: StartPage;

  test.beforeEach(async ({page}) => {
    startPage = await new StartPage(page)
      .goto();
  });

  test('should create a new Postponement from match details with a derived name', async ({page, checkA11y}) => {
    // 1. Click on "Create a new Postponement"
    await startPage.createLink.click();

    // 2. Check if we are on the create form (HTMX swap happened)
    const createPage = new CreatePage(page);
    await expect(createPage.heading)
      .toBeVisible();

    // 3. Fill in the match details and submit; no name is entered anywhere.
    const editPage = await createPage.create({
      homeTeam: 'Thun',
      guestTeam: 'Ostermundigen',
      originalMatchDateTime: '08/29/2026 04:00 pm',
    });

    // 4. The name is derived from the match details in the creator's locale.
    await expect(editPage.heading)
      .toContainText('Thun vs Ostermundigen – 08/29/2026 04:00 pm');

    // 5. Verify the owner password is displayed
    await expect(editPage.ownerPasswordAlert)
      .toBeVisible();

    const password = await editPage.ownerPassword;
    expect(password)
      .toBeTruthy();
    expect(password?.length)
      .toBeGreaterThan(0);

    // 6. Verify status and invite link
    await expect(editPage.status)
      .toContainText('Draft');
    await expect(page.getByText('Invite participants using these links'))
      .toBeVisible();

    await checkA11y();
  });

  test('should pass accessibility on create and edit pages', async ({page, checkA11y}) => {
    // Start page
    await checkA11y();

    // Create page
    await startPage.createLink.click();
    await checkA11y();

    // Submit and check Edit page
    const createPage = new CreatePage(page);
    await createPage.homeTeamInput.fill('A11y Test');
    await createPage.guestTeamInput.fill('A11y Opponent');
    await createPage.originalMatchDateTimeInput.fill('08/29/2026 04:00 pm');
    await Promise.all([
      page.waitForURL(/\/edit\/.+/),
      createPage.submitButton.click(),
    ]);
    await checkA11y();
  });
});
