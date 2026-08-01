import { devices } from '@playwright/test';
import { expect, test } from './fixtures';
import { EditPage } from './pages';

test.describe('Proposed date picker', () => {
  test('enhances the datetime input on desktop with air-datepicker', async ({page, checkA11y}) => {
    await EditPage.createSession(page, 'Date Picker Session');

    const editPage = new EditPage(page);
    const input = editPage.proposedDateTimeInput;
    await expect(input)
      .toHaveAttribute('type', 'text');

    await input.focus();
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

    await expect(input)
      .toHaveValue(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/);
  });
});

test.describe('Proposed date picker on touch devices', () => {
  const {defaultBrowserType: _defaultBrowserType, ...touchDevice} = devices['Pixel 5'];
  test.use({...touchDevice});

  test('keeps the native datetime-local input', async ({page}) => {
    await EditPage.createSession(page, 'Mobile Date Picker Session');

    const editPage = new EditPage(page);
    await expect(editPage.proposedDateTimeInput)
      .toHaveAttribute('type', 'datetime-local');
    await expect(page.locator('.air-datepicker'))
      .toHaveCount(0);
  });
});
