import { expect, test } from './fixtures';
import { StartPage } from './pages';

test.describe('Localization', () => {
  test('should switch language via header links', async ({page, checkA11y}) => {
    const startPage = await new StartPage(page)
      .goto();

    // Check default English
    await expect(startPage.welcomeHeading)
      .toContainText('Welcome to PostPony');

    // Switch to German
    await startPage.switchLanguage('de');

    // Verify German text
    await expect(startPage.welcomeHeading)
      .toContainText('Willkommen bei PostPony');

    // Switch back to English
    await startPage.switchLanguage('en');

    // Verify English text
    await expect(startPage.welcomeHeading)
      .toContainText('Welcome to PostPony');

    await checkA11y();
  });

  test('should persist language via query parameter and cookie', async ({page, checkA11y}) => {
    // Navigate with query parameter
    const startPage = new StartPage(page);
    await page.goto('/?lang=de');

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
    await startPage.switchLanguage('de');

    // Check localStorage
    const storedLang = await page.evaluate(() => localStorage.getItem('lang'));
    expect(storedLang)
      .toBe('de');

    // Clear cookies but keep localStorage
    await page.context()
      .clearCookies();

    // Reload page - it should redirect to /lang?lang=de because of localStorage sync
    await startPage.goto();
    await expect(startPage.welcomeHeading)
      .toContainText('Willkommen bei PostPony');

    await checkA11y();
  });
});
