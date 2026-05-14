import { expect, test } from './fixtures';

test.describe('Localization', () => {
  test('should switch language via header links', async ({page}) => {
    await page.goto('/');

    // Check default English
    await expect(page.getByRole('heading', {level: 2}))
      .toContainText('Welcome to the Game Postponer');

    // Switch to German
    await page.getByRole('navigation', {name: 'Language selection'})
      .getByRole('link', {name: 'German'})
      .click();

    // Verify German text
    await expect(page.getByRole('heading', {level: 2}))
      .toContainText('Willkommen beim Spiel-Verschieber');

    // Switch back to English
    await page.getByRole('navigation', {name: 'Sprachauswahl'})
      .getByRole('link', {name: 'Englisch'})
      .click();

    // Verify English text
    await expect(page.getByRole('heading', {level: 2}))
      .toContainText('Welcome to the Game Postponer');
  });

  test('should persist language via query parameter and cookie', async ({page}) => {
    // Navigate with query parameter
    await page.goto('/?lang=de');

    await expect(page.getByRole('heading', {level: 2}))
      .toContainText('Willkommen beim Spiel-Verschieber');

    // Navigate to another page, language should persist (via cookie)
    await page.goto('/create');
    await expect(page.getByRole('heading', {level: 2}))
      .toContainText('Neue Verschiebung erstellen');
  });

  test('should persist language in localStorage', async ({page}) => {
    await page.goto('/');

    // Switch to German
    await page.getByRole('navigation', {name: 'Language selection'})
      .getByRole('link', {name: 'German'})
      .click();

    // Check localStorage
    const storedLang = await page.evaluate(() => localStorage.getItem('lang'));
    expect(storedLang)
      .toBe('de');

    // Clear cookies but keep localStorage
    await page.context()
      .clearCookies();

    // Reload page - it should redirect to /lang?lang=de because of localStorage sync
    await page.goto('/');
    await expect(page.getByRole('heading', {level: 2}))
      .toContainText('Willkommen beim Spiel-Verschieber');
  });
});
