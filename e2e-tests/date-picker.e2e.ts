import { devices } from '@playwright/test';
import { expect, test } from './fixtures';
import { EditPage } from './pages';

test.describe('Proposed date picker', () => {
  test('opens via the explicit button and writes locale-format tokens', async ({page, checkA11y}) => {
    await EditPage.createSession(page, 'Date Picker Session');

    const editPage = new EditPage(page);
    const input = editPage.proposedDateTimeInput;
    await expect(input)
      .toHaveAttribute('type', 'text');

    // Focusing the text field must not open the picker on its own.
    await input.focus();
    await expect(page.locator('.air-datepicker.-active-'))
      .not
      .toBeVisible();

    // The explicit calendar button opens it.
    await editPage.pickerButton.click();
    const picker = page.locator('.air-datepicker.-active-');
    await expect(picker)
      .toBeVisible();

    await checkA11y();

    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1)
      .padStart(2, '0')}-${String(now.getDate())
      .padStart(2, '0')}`;
    await picker.locator(`[data-iso-date="${iso}"]`)
      .click();

    // The picker writes the locale's token format (en-US default in e2e).
    await expect(input)
      .toHaveValue(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} (am|pm)$/);
  });
});

test.describe('Proposed date picker on touch devices', () => {
  const {defaultBrowserType: _defaultBrowserType, ...touchDevice} = devices['Pixel 5'];
  test.use({...touchDevice});

  test('also uses the text input with a button-opened picker', async ({page}) => {
    await EditPage.createSession(page, 'Mobile Date Picker Session');

    const editPage = new EditPage(page);
    const input = editPage.proposedDateTimeInput;
    await expect(input)
      .toHaveAttribute('type', 'text');

    await editPage.pickerButton.click();
    await expect(page.locator('.air-datepicker.-active-'))
      .toBeVisible();
  });
});