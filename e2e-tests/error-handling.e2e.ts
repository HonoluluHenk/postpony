import { expect, test } from './fixtures';
import { CreatePage } from './pages';

test.describe('Error Handling', () => {
  test('should show 404 error page for non-existent session', async ({page, checkA11y}) => {
    const response = await page.goto('/edit/non-existent-id');
    expect(response?.status())
      .toBe(404);

    await expect(page.getByRole('heading', {name: 'Error', level: 2}))
      .toBeVisible();
    await expect(page.getByRole('alert'))
      .toContainText('Session not found');
    await expect(page.getByRole('link', {name: 'Return to Home'}))
      .toBeVisible();

    await checkA11y();
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
      .toContain('error');
  });

  test('should show HTMX error for invalid updates in edit page', async ({page, checkA11y}) => {
    // 1. Create a session first
    const createPage = await new CreatePage(page)
      .goto();
    await createPage.create('Error Test Session');

    // 2. Manually trigger an HTMX request to a non-existent session's sub-route
    await page.evaluate(async () => {
      const response = await fetch('/edit/invalid-id/venue', {
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

    await checkA11y();
  });

  test('error page should be accessible', async ({page, makeAxeBuilder}) => {
    await page.goto('/edit/non-existent-id');
    const accessibilityScanResults = await makeAxeBuilder()
      .analyze();
    expect(accessibilityScanResults.violations)
      .toEqual([]);
  });
});
