import { expect, test } from './fixtures';
import { EditPage } from './pages';
import { isoToLocaleDateTokens } from './pages/locale-tokens';

// The session's anchor is the scraped fixture match (14.01.2027, the
// createSession default), so the generator's
// `[max(today, anchor − 8w), anchor + 4w]` window reaches ~5 months ahead of
// today (env 2026-09) — wide enough to produce 10+ future candidates for any
// weekday + time pattern we feed.
// ponytail: the count is wall-clock dependent on the lower bound, so the
// assertions here check the live `toast.count === list.count` invariant
// instead of nailing the absolute date list.

// Two NON-adjacent weekdays (Wednesday 3, Saturday 6): every blank row
// (Mon/Tue/Thu/Fri/Sun) sits next to, between, or beyond a filled one, so any
// date leaking out of a blank row breaks the exact-weekday assertion below.
const TUPLES = [
  {weekday: 6, time: '08:00 pm'}, // Saturday 20:00 in en-US
  {weekday: 3, time: '07:30 pm'}, // Wednesday 19:30 in en-US
] as const;

const expectedByWeekday = new Map<number, {
  hour: number;
  minute: number
}>(
  TUPLES.map(({weekday, time}): [
    number, {
      hour: number;
      minute: number
    }
  ] => [weekday, hourMinute(time)]),
);

function hourMinute(ampmTime: string): {
  hour: number;
  minute: number
}
{
  const match = /^(\d{1,2}):(\d{2}) (am|pm)$/i.exec(ampmTime);
  if (match === null) {
    throw new Error(`generator test times must be 'hh:mm am/pm', got '${ampmTime}'`);
  }
  const hourText = match[1] ?? '0';
  const minuteText = match[2] ?? '0';
  const ampm = match[3] ?? 'am';
  const hour = (Number(hourText) % 12) + (ampm.toLowerCase() === 'pm' ? 12 : 0);
  return {hour, minute: Number(minuteText)};
}

// ISO weekday (1=Mon .. 7=Sun) derived from a parsed Date. The display text
// prefixes the short weekday label ("Mo, " …), but the assertion needs the
// date itself to stay ground truth; the filled times (19:30 / 20:00) sit far
// enough from midnight that the parse's implicit local timezone cannot roll
// the weekday over.
function isoWeekday(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

// Strips the weekday-label prefix ("Mo, ", "Tu, ", …) the Proposed Date
// display now carries, leaving a date-only string `Date` can parse.
function stripWeekdayPrefix(displayText: string): string {
  return displayText.replace(/^[A-Za-z]{2}, /, '');
}

// The from/to window is bounded below by max(today, anchor − 8w), so a fixed
// ISO string rots the day the wall clock passes it (2026-09-01 did). Build the
// fill values relative to today, anchored at local noon to dodge UTC day-roll.
function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const FROM = isoDate(1); // tomorrow
const TO = isoDate(22); // ~3 weeks after FROM

test.describe('Proposed Date Generator', () => {
  test('generates the matching datetimes, dedupes re-submissions, and keeps deletion in sync',
    async ({
             page,
             checkA11y,
           }) => {
      // The heaviest test in the suite: scrape session + three a11y scans + two
      // submissions + a deletion. Runs ~8s of the default 10s budget in
      // isolation, so under full-suite parallel contention (91 tests) axe's
      // scan can exceed it. Tripled to 30s.
      test.slow();

      await EditPage.createSession(page);
      const editPage = new EditPage(page);

      await expect(editPage.status)
        .toContainText('Draft');

      // Open generator form: a11y green before any submission so regressions in
      // the new section surface first.
      await checkA11y();

      // The fixed Monday–Sunday grid ships as seven time inputs (each with a
      // time-only picker trigger), the two From/To picker buttons, and exactly
      // one submit button.
      await expect(editPage.generateForm.locator('input[name="time[]"]'))
        .toHaveCount(7);
      await expect(editPage.generateTimePickerButtons)
        .toHaveCount(7);
      await expect(editPage.generateForm.getByRole('button'))
        .toHaveCount(10);

      await editPage.generateProposedDates([...TUPLES]);

      // Success toast carries the localized, server-computed count. Reading the
      // number from the rendered text grounds the subsequent list assertions in
      // the same value the handler actually emitted — "Added by user" rather
      // than "any number > 0".
      const successToast = page.getByRole('alert')
        .filter({hasText: /\d+ dates? added/});
      await expect(successToast)
        .toBeVisible();
      const toastText = (await successToast.textContent()) ?? '';
      const toastMatch = /(\d+) dates? added/.exec(toastText);
      expect(toastMatch)
        .not
        .toBeNull();
      const addedCount = Number(toastMatch?.[1]);
      expect(Number.isInteger(addedCount))
        .toBe(true);
      expect(addedCount)
        .toBeGreaterThan(0);

      // Generated dates appear in the regular #proposed-date-list. The toast
      // count must match the visible list count exactly so a regression that
      // drops datetimes on the floor (or duplicates them) fails this test.
      const items = editPage.proposedDateRows;
      await expect(items)
        .toHaveCount(addedCount);

      const displays = await items.allTextContents();
      expect(displays)
        .toHaveLength(addedCount);
      // Each row must render an actual datetime in the en-US locale shape —
      // not just whatever's left over from another element.
      for (const text of displays) {
        expect(text)
          .toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
      }
      // Two equal proposals would surface as duplicate text — fail loudly.
      expect(new Set(displays).size)
        .toBe(displays.length);

      // Every generated date must land on exactly one of the two filled
      // weekdays at exactly the typed time. A date slipping out of any of the
      // five blank rows (Mon/Tue/Thu/Fri/Sun) fails the weekday map lookup.
      const dateTexts = await editPage.proposedDateDisplays();
      expect(dateTexts)
        .toHaveLength(addedCount);
      for (const dateText of dateTexts) {
        // Node's en-US rendering is "Tu, Sep 30, 2026, 7:30 PM" (older ICU:
        // "… at 7:30 PM"), so drop the weekday prefix and normalise the
        // separator before parsing the date-only text; trailing button labels
        // never reach this string.
        const date = new Date(stripWeekdayPrefix(dateText)
          .replace(' at ', ', '));
        expect(Number.isNaN(date.getTime()))
          .toBe(false);
        const expected = expectedByWeekday.get(isoWeekday(date));
        expect(expected)
          .toBeDefined();
        if (expected === undefined) {
          continue;
        }
        expect([date.getHours(), date.getMinutes()])
          .toEqual([expected.hour, expected.minute]);
      }
      // The two filled weekdays are the ONLY weekdays present — the blank rows
      // produced no Proposed Dates.
      expect([
        ...new Set(
          dateTexts.map((t) => isoWeekday(new Date(stripWeekdayPrefix(t)
            .replace(' at ', ', ')))),
        ),
      ].sort((a, b) => a - b))
        .toEqual([...expectedByWeekday.keys()].sort((a, b) => a - b));

      // Status flips Draft → Voting once a date is on the list.
      await expect(editPage.status)
        .toContainText('Voting');

      await checkA11y();

      // Re-submitting the same tuples dedupes against existingStarts: no DB
      // write, list unchanged, inline empty-result message rendered, no toast.
      await editPage.generateProposedDates([...TUPLES]);
      await expect(page.getByText('No dates were added.'))
        .toBeVisible();
      await expect(successToast)
        .toHaveCount(0);
      await expect(items)
        .toHaveCount(addedCount);
      const displaysAfter = await items.allTextContents();
      expect(displaysAfter)
        .toEqual(displays);

      // Generated Proposed Dates still flow through the existing deletion
      // buttons + confirm dialog — covering issue 03's "no regression on
      // existing list controls" expectation.
      await editPage.deleteProposedDate(0);
      await expect(items)
        .toHaveCount(addedCount - 1);
    });

  test('hides the fill-to-generate grid once a date is confirmed', async ({page, checkA11y}) => {
    const {editPage} = await EditPage.createSession(page, ['2026-09-20T20:00']);

    // In a votable state the grid is present with all seven rows.
    await expect(editPage.generateForm)
      .toBeVisible();
    await expect(editPage.generateForm.locator('input[name="time[]"]'))
      .toHaveCount(7);

    await editPage.confirmDate(0);
    await expect(editPage.status)
      .toContainText('Confirmed');

    // Confirming swaps the section to the reopen form — the generator block
    // (and its rows) is gone from the edit view.
    await expect(editPage.generateForm)
      .toHaveCount(0);
    await expect(editPage.generateTimeInput(0))
      .toHaveCount(0);
    await expect(editPage.reopenButton())
      .toBeVisible();

    await checkA11y();
  });

  test('valid from/to range generates dates within the window', async ({page}) => {
    const {editPage} = await EditPage.createSession(page);

    // Fill from/to with a valid range inside the allowed window
    // Anchor is the scraped match (2027-01-14), cap is 2027-02-11 (4 weeks after)
    // from=tomorrow, to=FROM+21d — both ≥ today, both ≤ cap until early 2027.
    await editPage.fillFromDate(FROM);
    await editPage.fillToDate(TO);
    await editPage.generateProposedDates([...TUPLES]);

    const successToast = page.getByRole('alert')
      .filter({hasText: /\d+ dates? added/});
    await expect(successToast)
      .toBeVisible();

    // The generator echoes the picked window back as en-US locale tokens
    // (MM/dd/yyyy), not ISO strings.
    await expect(editPage.fromDateInput)
      .toHaveValue(isoToLocaleDateTokens('en-US', FROM));
    await expect(editPage.toDateInput)
      .toHaveValue(isoToLocaleDateTokens('en-US', TO));

    const items = editPage.proposedDateRows;
    const count = await items.count();
    expect(count)
      .toBeGreaterThan(0);

    // All generated dates must fall within [from, to]
    const dateTexts = await editPage.proposedDateDisplays();
    const fromDate = new Date(`${FROM}T00:00`);
    const toDate = new Date(`${TO}T23:59`);
    for (const dateText of dateTexts) {
      const date = new Date(stripWeekdayPrefix(dateText)
        .replace(' at ', ', '));
      expect(date.getTime())
        .toBeGreaterThanOrEqual(fromDate.getTime());
      expect(date.getTime())
        .toBeLessThanOrEqual(toDate.getTime());
    }
  });

  test('from before today shows error and no dates added', async ({page}) => {
    const {editPage} = await EditPage.createSession(page);

    const initialCount = await editPage.proposedDateRows.count();

    // Set from to a date in the past
    await editPage.fillFromDate('2020-01-01');
    await editPage.fillToDate('2026-10-01');
    await editPage.generateProposedDates([...TUPLES]);

    await expect(editPage.fromDateError)
      .toBeVisible();
    await expect(editPage.fromDateError)
      .toContainText('Date must be today or later');
    // The invalid from stays in the field as the submitted en-US token.
    await expect(editPage.fromDateInput)
      .toHaveValue('01/01/2020');

    const finalCount = await editPage.proposedDateRows.count();
    expect(finalCount)
      .toBe(initialCount);
  });

  test('to before or equal to from shows error and no dates added', async ({page}) => {
    const {editPage} = await EditPage.createSession(page);

    const initialCount = await editPage.proposedDateRows.count();

    // today is ~2026-08-29 per env, so from=2026-09-10, to=2026-09-05 (to < from)
    await editPage.fillFromDate('2026-09-10');
    await editPage.fillToDate('2026-09-05');
    await editPage.generateProposedDates([...TUPLES]);

    await expect(editPage.toDateError)
      .toBeVisible();
    // Both values stay as the submitted en-US tokens, flagged on To.
    await expect(editPage.fromDateInput)
      .toHaveValue('09/10/2026');
    await expect(editPage.toDateInput)
      .toHaveValue('09/05/2026');

    const finalCount = await editPage.proposedDateRows.count();
    expect(finalCount)
      .toBe(initialCount);
  });

  test('to beyond originalMatchDateTime + 4w shows error and no dates added', async ({page}) => {
    const {editPage} = await EditPage.createSession(page);

    const initialCount = await editPage.proposedDateRows.count();

    // Anchor is the scraped match (2027-01-14), cap is 2027-02-11 (4 weeks after)
    // Set to beyond the cap
    await editPage.fillFromDate(FROM);
    await editPage.fillToDate('2027-03-01');
    await editPage.generateProposedDates([...TUPLES]);

    await expect(editPage.toDateError)
      .toBeVisible();
    await expect(editPage.toDateError)
      .toContainText('at most 4 weeks after the original match');
    // The too-late to stays in the field as the submitted en-US token.
    await expect(editPage.toDateInput)
      .toHaveValue('03/01/2027');

    const finalCount = await editPage.proposedDateRows.count();
    expect(finalCount)
      .toBe(initialCount);
  });

  test('custom from/to with anchor generates within specified range', async ({page}) => {
    const {editPage} = await EditPage.createSession(page);

    // Narrow window: only one week starting 2026-09-07 (Monday)
    // Anchor is the scraped match (2027-01-14), cap is 2027-02-11
    // from=2026-09-07, to=2026-09-13 (one week: Mon-Sun)
    await editPage.fillFromDate('2026-09-07');
    await editPage.fillToDate('2026-09-13');
    await editPage.generateProposedDates([...TUPLES]);

    const successToast = page.getByRole('alert')
      .filter({hasText: /\d+ dates? added/});
    await expect(successToast)
      .toBeVisible();

    const dateTexts = await editPage.proposedDateDisplays();
    const fromDate = new Date('2026-09-07T00:00');
    const toDate = new Date('2026-09-13T23:59');
    for (const dateText of dateTexts) {
      const date = new Date(stripWeekdayPrefix(dateText)
        .replace(' at ', ', '));
      expect(date.getTime())
        .toBeGreaterThanOrEqual(fromDate.getTime());
      expect(date.getTime())
        .toBeLessThanOrEqual(toDate.getTime());
    }

    // Should only contain Wednesday (2026-09-09) and Saturday (2026-09-12)
    const weekdays: number[] = dateTexts.map((dateText: string): number => isoWeekday(new Date(stripWeekdayPrefix(dateText)
      .replace(' at ', ', '))));
    expect([...new Set(weekdays)].sort((a: number, b: number): number => a - b))
      .toEqual([3, 6]);
  });

  test('row time pickers open via their buttons, step 15 minutes, and write the locale token', async ({page, checkA11y}) => {
    const {editPage} = await EditPage.createSession(page);

    // Focusing a row input never opens a picker — free typing stays available.
    await editPage.generateTimeInput(0)
      .focus();
    await expect(page.locator('.air-datepicker'))
      .toHaveCount(0);

    // Only the row's own button opens its picker.
    await editPage.generateTimePickerButton(0)
      .click();
    const picker = page.locator('.air-datepicker.-active-');
    await expect(picker)
      .toHaveCount(1);
    await expect(picker)
      .toBeVisible();

    // The picker is time-only: the calendar view is hidden, the minute slider
    // steps in 15-minute increments, the hour slider keeps whole hours.
    await expect(picker.locator('.air-datepicker--content'))
      .toBeHidden();
    await expect(picker.locator('input[name="minutes"]'))
      .toHaveAttribute('step', '15');
    await expect(picker.locator('input[name="hours"]'))
      .toHaveAttribute('step', '1');

    // An empty row opens at the evening default (20:00 / 08:00 PM), not the
    // current wall-clock time, and the input itself stays empty until picked.
    await expect(picker.locator('input[name="hours"]'))
      .toHaveValue('20');
    await expect(picker.locator('input[name="minutes"]'))
      .toHaveValue('0');
    await expect(editPage.generateTimeInput(0))
      .toHaveValue('');

    // Dragging the sliders to a quarter-hour slot writes the en-US 'hh:mm aa'
    // token into the row input (the server grammar accepts it verbatim).
    await picker.locator('input[name="hours"]')
      .fill('10');
    await picker.locator('input[name="minutes"]')
      .fill('30');
    await expect(editPage.generateTimeInput(0))
      .toHaveValue(/^\d{1,2}:\d{2} (am|pm)$/);

    // The open picker's time sliders carry the patched localized aria-labels.
    await checkA11y();
  });

  test('row inputs stay plain text: typed off-grid times are untouched by the picker', async ({page}) => {
    const {editPage} = await EditPage.createSession(page);

    // Simulate an echoed/validation-error value that is off-grid (19:37 is not
    // a quarter-hour step). Opening and interacting with the picker must never
    // rewrite it — the row keeps whatever the user typed.
    const rowInput = editPage.generateTimeInput(0);
    await rowInput.fill('19:37');
    await editPage.generateTimePickerButton(0)
      .click();
    const picker = page.locator('.air-datepicker.-active-');
    await expect(picker)
      .toBeVisible();
    await expect(rowInput)
      .toHaveValue('19:37');
  });

  test('proposes dates with a chosen venue and shows the venue badge in the list', async ({page, checkA11y}) => {
    const {editPage} = await EditPage.createSession(page);

    // Pick venue 2 in the generator form; every generated date carries it.
    await editPage.generateVenueSelect.selectOption('2');
    await editPage.generateProposedDates([...TUPLES]);

    const successToast = page.getByRole('alert')
      .filter({hasText: /\d+ dates? added/});
    await expect(successToast)
      .toBeVisible();

    const items = editPage.proposedDateRows;
    const count = await items.count();
    expect(count)
      .toBeGreaterThan(0);

    // Each list row renders the venue badge for the chosen venue. (The row's
    // clash chip also carries the generic .chip class, so scope to .venue-badge.)
    const venueBadges = editPage.proposedDateRows.locator('.venue-badge');
    await expect(venueBadges)
      .toHaveCount(count);
    await expect(venueBadges.first())
      .toHaveText('(2)');

    await checkA11y();
  });
});
