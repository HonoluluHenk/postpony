import { expect, test } from './fixtures';

test.describe('Error Handling', () => {
  test('should show 404 error page for non-existent session', async ({page}) => {
    const response = await page.goto('/edit/non-existent-id');
    expect(response?.status())
      .toBe(404);

    await expect(page.getByRole('heading', {name: 'Error', level: 2}))
      .toBeVisible();
    await expect(page.getByRole('alert'))
      .toContainText('Session not found');
    await expect(page.getByRole('link', {name: 'Return to Home'}))
      .toBeVisible();
  });

  test('should show validation error for missing name in creation', async ({page}) => {
    // We use a direct request to avoid HTMX/Playwright interaction complexities for this specific edge case
    const response = await page.request.post('/create', {
      form: {name: ''},
      headers: {'Accept': 'text/html'},
    });

    expect(response.status())
      .toBe(400);
    const html = await response.text();
    expect(html)
      .toContain('Name is required');
    expect(html)
      .toContain('error-message');
  });

  test('should show HTMX error for invalid updates in edit page', async ({page}) => {
    // 1. Create a session first
    await page.goto('/create');
    await page.getByLabel('ReSchedule Name')
      .fill('Error Test Session');
    await page.getByRole('button', {name: 'Create ReSchedule'})
      .click();
    await page.waitForURL(/\/edit\/.+/);

    const url = page.url();
    const sessionId = url.split('/edit/')[1]?.split('?')[0];

    // 2. Manually trigger an HTMX request to a non-existent session's sub-route
    await page.evaluate(async () => {
      const response = await fetch(`/edit/invalid-id/venue`, {
        method: 'POST',
        headers: {'HX-Request': 'true'},
      });
      const html = await response.text();
      const div = document.createElement('div');
      div.id = 'error-test';
      div.innerHTML = html;
      document.body.appendChild(div);
    });

    await expect(page.getByRole('alert')
      .last())
      .toContainText('Session not found');
  });

  test('error page should be accessible', async ({page, makeAxeBuilder}) => {
    await page.goto('/edit/non-existent-id');
    const accessibilityScanResults = await makeAxeBuilder()
      .analyze();
    expect(accessibilityScanResults.violations)
      .toEqual([]);
  });
});
