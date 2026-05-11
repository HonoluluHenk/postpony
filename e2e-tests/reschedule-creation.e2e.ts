import { expect, test } from './fixtures';

test.describe('Reschedule Creation', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
  });

  test('should create a new Reschedule session', async ({page}) => {
    // 1. Click on "Create a new ReSchedule"
    await page.getByRole('button', {name: 'Create a new ReSchedule'})
      .click();

    // 2. Check if we are on the create form (HTMX swap happened)
    await expect(page.locator('h2'))
      .toContainText('Create a New ReSchedule');

    // 3. Fill in the name and submit
    const sessionName = 'Test Tournament 2024';
    await page.getByLabel('ReSchedule Name')
      .fill(sessionName);
    await page.getByRole('button', {name: 'Create ReSchedule'})
      .click();

    // 4. Check if we moved to the edit screen
    await expect(page.locator('h2'))
      .toContainText(`Editing ReSchedule: ${sessionName}`);

    // 5. Verify the owner password is displayed
    const alert = page.locator('.alert');
    await expect(alert)
      .toBeVisible();
    await expect(alert)
      .toContainText('Your Owner Password is:');

    const password = await page.locator('.password-display')
      .textContent();
    expect(password)
      .toBeTruthy();
    expect(password?.length)
      .toBeGreaterThan(0);

    // 6. Verify status and invite link
    await expect(page.locator('main'))
      .toContainText('Status: Draft');
    await expect(page.locator('main'))
      .toContainText('Invite participants using this link:');
  });

  test('should pass accessibility on create and edit pages', async ({page, checkA11y}) => {
    // Start page
    await checkA11y();

    // Create page
    await page.getByRole('button', {name: 'Create a new ReSchedule'})
      .click();
    await checkA11y();

    // Submit and check Edit page
    await page.getByLabel('ReSchedule Name')
      .fill('A11y Test');
    await Promise.all([
      page.waitForURL(/\/edit\/.+/),
      page.getByRole('button', {name: 'Create ReSchedule'})
        .click(),
    ]);
    await checkA11y();
  });
});
