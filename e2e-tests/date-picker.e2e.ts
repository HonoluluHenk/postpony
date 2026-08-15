import { devices } from '@playwright/test';
import { expect, test } from './fixtures';
import { EditPage } from './pages';

test.describe('Proposed date picker', () => {
  test('opens via the explicit button and writes locale-format tokens', async ({page, checkA11y}) => {
    await EditPage.createSession(page);

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

    // The Material dynamic-color theme applies its tonal palette asynchronously;
    // wait for it to settle before the axe scan — a mid-transition tone can sit
    // just under the 4.5:1 contrast bar and flake the scan.
    await expect.poll(async () => {
      const sample = (): Promise<string> =>
        picker.locator('.air-datepicker-body--day-name')
          .first()
          .evaluate((el) => getComputedStyle(el).color);
      const first = await sample();
      await new Promise((resolve) => setTimeout(resolve, 150));
      const second = await sample();
      return first === second ? first : '';
    }).toBeDefined();

    await checkA11y();

    // The edit page pre-fills the input with the original match datetime, so
    // the picker opens on that month — click any in-month day rather than
    // "today", which may live in another month. Exclude -other-month- cells
    // (adjacent-month filler days).
    await picker.locator('[data-iso-date]:not(.-other-month-)')
      .first()
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
    await EditPage.createSession(page);

    const editPage = new EditPage(page);
    const input = editPage.proposedDateTimeInput;
    await expect(input)
      .toHaveAttribute('type', 'text');

    await editPage.pickerButton.click();
    await expect(page.locator('.air-datepicker.-active-'))
      .toBeVisible();
  });
});