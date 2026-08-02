import { expect, test } from './fixtures';
import { StartPage } from './pages';

test.describe('Localization', () => {
  test('should switch language via the header dropdown', async ({page, checkA11y}) => {
    const startPage = await new StartPage(page)
      .goto();

    // Check default English (Playwright sends Accept-Language: en-US)
    await expect(startPage.welcomeHeading)
      .toContainText('Welcome to PostPony');

    // The dropdown lists all four locales.
    await expect(page.locator('#language-select option'))
      .toHaveCount(4);

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
    await page.goto('/create');
    await expect(page.getByRole('heading', {level: 2}))
      .toContainText('Neue Verschiebung erstellen');

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
});
