import { devices, type Locator } from '@playwright/test';
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

    // The picker only offers quarter-hour slots: the minute slider steps by 15
    // while the hour slider keeps its 1-hour steps.
    await expect(picker.locator('input[name="minutes"]'))
      .toHaveAttribute('step', '15');
    await expect(picker.locator('input[name="hours"]'))
      .toHaveAttribute('step', '1');

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

  test('stays live after an HTMX error re-render of the section', async ({page}) => {
    await EditPage.createSession(page);

    const editPage = new EditPage(page);

    // An invalid datetime submission swaps the section back with a re-initted
    // picker; the fresh calendar button must still open it.
    await editPage.proposedDateTimeInput.fill('not-a-date');
    await editPage.addProposedDateButton.click();
    await expect(page.getByRole('alert')
      .filter({hasText: 'Please provide a valid date and time'}))
      .toBeVisible();

    await editPage.pickerButton.click();
    await expect(page.locator('.air-datepicker.-active-'))
      .toBeVisible();
  });

  test('From and To pickers open via their buttons and write locale tokens', async ({page, checkA11y}) => {
    const {editPage} = await EditPage.createSession(page);

    // Each of the generator's From/To fields gets its own explicit calendar
    // button with a distinct accessible name.
    const pickers: {button: Locator; input: Locator}[] = [
      {button: editPage.fromDatePickerButton, input: editPage.fromDateInput},
      {button: editPage.toDatePickerButton, input: editPage.toDateInput},
    ];
    for (const {button, input} of pickers) {
      // Focusing the text field must not open the picker on its own.
      await input.focus();
      await expect(page.locator('.air-datepicker.-active-'))
        .not
        .toBeVisible();

      // The explicit calendar button opens the date-only picker.
      await button.click();
      const picker = page.locator('.air-datepicker.-active-');
      await expect(picker)
        .toBeVisible();

      // Date-only pickers have no time sliders.
      await expect(picker.locator('input[name="hours"]'))
        .toHaveCount(0);
      await expect(picker.locator('input[name="minutes"]'))
        .toHaveCount(0);

      // The Material dynamic-color theme applies its tonal palette
      // asynchronously; wait for it to settle before the axe scan.
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

      // An open From/To picker passes the accessibility check.
      await checkA11y();

      // Click an in-month day (exclude -other-month- filler cells); From/To
      // prefill to today/this week's range, so an in-month day exists.
      await picker.locator('[data-iso-date]:not(.-other-month-)')
        .first()
        .click();

      // The picker writes the locale's date-only token format (en-US MM/dd/yyyy).
      await expect(input)
        .toHaveValue(/^\d{2}\/\d{2}\/\d{4}$/);

      // Close the picker before opening the next one.
      await page.keyboard.press('Escape');
      await expect(picker)
        .not
        .toBeVisible();
    }
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