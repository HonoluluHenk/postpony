import { expect, test } from './fixtures';
import { EditPage } from './pages';

// Anchor 2026-09-15 sits ~2.5 weeks ahead of today (env 2026-08-29) so the
// generator's `[max(today, anchor − 8w), anchor + 4w]` window is wide enough
// to produce 10+ future candidates for any weekday + time pattern we feed.
// ponytail: the count is wall-clock dependent on the lower bound, so the
// assertions here check "X > 0" / "X == initialCount" rather than nailing
// the absolute date list.
const ANCHOR = '2026-09-15T20:00';

const TUPLES = [
  {weekday: 6, time: '08:00 pm'}, // Saturday 20:00 in en-US
  {weekday: 3, time: '07:30 pm'}, // Wednesday 19:30 in en-US
] as const;

test.describe('Proposed Date Generator', () => {
  test('should generate, dedupe re-submissions, and keep deletion in sync', async ({page, checkA11y}) => {
    await EditPage.createSession(page, undefined, ANCHOR);
    const editPage = new EditPage(page);

    await expect(editPage.status)
      .toContainText('Draft');

    // Open generator form: a11y green before any submission so regressions in
    // the new section surface first.
    await checkA11y();

    await editPage.generateProposedDates([...TUPLES]);

    // Success toast carries the localized count.
    await expect(page.getByRole('alert')
      .filter({hasText: /\d+ dates? added/}))
      .toBeVisible();

    // Generated dates land in the regular #proposed-date-list, mixed with
    // the existing deletion / votability controls.
    const list = editPage.proposedDateList.getByRole('listitem');
    const initialCount = await list.count();
    expect(initialCount).toBeGreaterThan(0);

    // Status flips Draft → Voting once a date is on the list.
    await expect(editPage.status)
      .toContainText('Voting');

    await checkA11y();

    // Re-submitting the same tuples dedupes against existingStarts: no DB
    // write, list unchanged, inline empty-result message rendered.
    await editPage.generateProposedDates([...TUPLES]);
    await expect(page.getByText('No dates were added.'))
      .toBeVisible();
    await expect(list).toHaveCount(initialCount);

    // Generated Proposed Dates still flow through the existing deletion
    // buttons + confirm dialog — covering issue 03's "no regression on
    // existing list controls" expectation.
    await editPage.deleteProposedDate(0);
    await expect(list).toHaveCount(initialCount - 1);
  });
});
