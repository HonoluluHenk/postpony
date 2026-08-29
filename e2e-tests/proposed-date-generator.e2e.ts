import { expect, test } from './fixtures';
import { EditPage } from './pages';

// Anchor 2026-09-15 sits ~2.5 weeks ahead of today (env 2026-08-29) so the
// generator's `[max(today, anchor − 8w), anchor + 4w]` window is wide enough
// to produce 10+ future candidates for any weekday + time pattern we feed.
// ponytail: the count is wall-clock dependent on the lower bound, so the
// assertions here check the live `toast.count === list.count` invariant
// instead of nailing the absolute date list.
const ANCHOR = '2026-09-15T20:00';

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

test.describe('Proposed Date Generator', () => {
  test('generates the matching datetimes, dedupes re-submissions, and keeps deletion in sync',
    async ({
             page,
             checkA11y,
           }) => {
      await EditPage.createSession(page, undefined, ANCHOR);
      const editPage = new EditPage(page);

      await expect(editPage.status)
        .toContainText('Draft');

      // Open generator form: a11y green before any submission so regressions in
      // the new section surface first.
      await checkA11y();

      // The fixed Monday–Sunday grid ships as seven time inputs with no row
      // add/remove controls — only the Generate submit button.
      await expect(editPage.generateForm.locator('input[name="time[]"]'))
        .toHaveCount(7);
      await expect(editPage.generateForm.getByRole('button'))
        .toHaveCount(1);

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

    await editPage.toggleVotableByOpponent(0);
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
});
