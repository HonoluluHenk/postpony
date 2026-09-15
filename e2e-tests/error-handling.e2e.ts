import { expect, test } from './fixtures';
import { EditPage } from './pages';

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

  test('should show validation error for a scrape submission without match details', async ({page}) => {
    // We use a direct request to avoid HTMX/Playwright interaction complexities for this specific edge case
    const response = await page.request.post('/create/scrape/match', {
      form: {teamName: 'Ostermundigen'},
      // Raw requests send no Accept-Language; pick English explicitly so the
      // asserted message is deterministic regardless of the default locale.
      headers: {'Accept': 'text/html', 'Accept-Language': 'en-US'},
    });

    expect(response.status())
      .toBe(400);
    const html = await response.text();
    expect(html)
      .toContain('Missing required parameter: match');
    expect(html)
      .toContain('error');
  });

  test('should show a retryable inline error when a wizard scrape fails (boosted flow)', async ({page, checkA11y}) => {
    await page.goto('/create/scrape');
    await expect(page.getByRole('heading', {name: 'Choose your league', level: 2}))
      .toBeVisible();

    // Rewrite the boosted groups request so the server-side fixture read hits the
    // e2e error marker. Browser-level interception only; the scrape happens on the
    // server, so the marker rides in through the forwarded championship parameter.
    await page.route(
      (url) => url.pathname === '/create/scrape/groups',
      async (route) => {
        const url = new URL(route.request()
          .url());
        url.searchParams.set('championship', 'E2E_ERROR');
        await route.continue({url: url.toString()});
      },
    );

    await page.getByRole('link', {name: 'MTTV 2026/27', exact: true})
      .click();

    // The boosted swap replaces the wizard step in place with the error shell.
    await expect(page.getByRole('heading', {name: 'Find your match (click-tt.ch)', level: 2}))
      .toBeVisible();
    await expect(page.getByRole('alert'))
      .toContainText('click-tt.ch is currently reporting an error.');
    await expect(page.getByRole('link', {name: 'Try again'}))
      .toBeVisible();
    await expect(page.getByRole('link', {name: 'Back'}))
      .toBeVisible();

    await checkA11y();
  });

  test('should show HTMX error for invalid updates in edit page', async ({page, checkA11y}) => {
    // 1. Create a session first
    await EditPage.createSession(page);

    // 2. Manually trigger an HTMX request to a non-existent session's sub-route
    await page.evaluate(async () => {
      const response = await fetch('/edit/invalid-id/players', {
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
