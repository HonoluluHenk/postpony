import { expect, test } from './fixtures';
import { EditPage } from './pages';

// Anchor 2026-09-15 sits ~2.5 weeks ahead of today (env 2026-08-29) so the
// generator's `[max(today, anchor − 8w), anchor + 4w]` window is wide enough
// to produce 10+ future candidates for any weekday + time pattern we feed.
// ponytail: the count is wall-clock dependent on the lower bound, so the
// assertions here check the live `toast.count === list.count` invariant
// instead of nailing the absolute date list.
const ANCHOR = '2026-09-15T20:00';

const TUPLES = [
  {weekday: 6, time: '08:00 pm'}, // Saturday 20:00 in en-US
  {weekday: 3, time: '07:30 pm'}, // Wednesday 19:30 in en-US
] as const;

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
      const items = editPage.proposedDateList.getByRole('listitem');
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
});
