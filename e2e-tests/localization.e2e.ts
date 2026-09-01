import { expect, test } from './fixtures';
import { EditPage, JoinPage, StartPage } from './pages';

test.describe('Localization', () => {
  test('should switch language via the header dropdown', async ({page, checkA11y}) => {
    const startPage = await new StartPage(page)
      .goto();

    // Check default English (Playwright sends Accept-Language: en-US)
    await expect(startPage.welcomeHeading)
      .toContainText('Welcome to PostPony');

    // The dropdown lists all four locales, each with its language-country flag.
    await expect(page.locator('#language-select option'))
      .toHaveCount(4);
    await expect(page.locator('#language-select option[value="de-CH"]'))
      .toContainText('🇩🇪');
    await expect(page.locator('#language-select option[value="fr-CH"]'))
      .toContainText('🇫🇷');
    await expect(page.locator('#language-select option[value="it-CH"]'))
      .toContainText('🇮🇹');
    await expect(page.locator('#language-select option[value="en-US"]'))
      .toContainText('🇬🇧');

    // Switch to German
    await startPage.switchLanguage('de-CH');

    // Verify German text
    await expect(startPage.welcomeHeading)
      .toContainText('Willkommen bei PostPony');

    // Switch back to English
    await startPage.switchLanguage('en-US');

    // Verify English text
    await expect(startPage.welcomeHeading)
      .toContainText('Welcome to PostPony');

    await checkA11y();
  });

  test('should fall back to English text for fr-CH and it-CH until translations land', async ({page}) => {
    const startPage = await new StartPage(page)
      .goto();

    await startPage.switchLanguage('fr-CH');
    await expect(startPage.welcomeHeading)
      .toContainText('Welcome to PostPony');

    await startPage.switchLanguage('it-CH');
    await expect(startPage.welcomeHeading)
      .toContainText('Welcome to PostPony');
  });

  test('should persist language via query parameter and cookie', async ({page, checkA11y}) => {
    // Navigate with query parameter
    const startPage = new StartPage(page);
    await page.goto('/?lang=de-CH');

    await expect(startPage.welcomeHeading)
      .toContainText('Willkommen bei PostPony');

    // Navigate to another page, language should persist (via cookie)
    await page.goto('/create/scrape');
    await expect(page.getByRole('heading', {level: 2}))
      .toContainText('Wählen Sie Ihre Liga');

    await checkA11y();
  });

  test('should persist language in localStorage', async ({page, checkA11y}) => {
    const startPage = await new StartPage(page)
      .goto();

    // Switch to German
    await startPage.switchLanguage('de-CH');

    // Wait for the language-switch navigation to settle before touching the page.
    await expect(startPage.welcomeHeading)
      .toContainText('Willkommen bei PostPony');

    // Check localStorage
    const storedLang = await page.evaluate(() => localStorage.getItem('lang'));
    expect(storedLang)
      .toBe('de-CH');

    // Clear cookies but keep localStorage
    await page.context()
      .clearCookies();

    // Reload page - it should redirect to /?lang=de-CH because of localStorage sync
    await startPage.goto();
    await expect(startPage.welcomeHeading)
      .toContainText('Willkommen bei PostPony');

    await checkA11y();
  });

  test('should preserve query parameters when switching language on join page', async ({page}) => {
    const {session} = await EditPage.createSession(page);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);

    // Verify the join page loaded successfully with token present
    await expect(joinPage.heading)
      .toBeVisible();

    // Switch to German
    await joinPage.switchLanguage('de-CH');

    // Token must be preserved — page should still show the join form (not error page)
    const germanHeading = page.getByRole('heading', {name: 'Der Verschiebung beitreten', level: 2});
    await expect(germanHeading)
      .toBeVisible();

    // Switch back to English
    await joinPage.switchLanguage('en-US');
    await expect(joinPage.heading)
      .toBeVisible();
  });
});
