import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { EditPage, JoinPage } from './pages';

async function assertCalendarExport(
  page: Page,
  link: { getAttribute(name: string): Promise<string | null> },
): Promise<void> {
  const href = (await link.getAttribute('href')) ?? '';
  expect(href)
    .toMatch(/\/calendar\.ics(\?token=.*)?$/);

  const response = await page.request.get(href);
  expect(response.status())
    .toBe(200);
  expect(response.headers()['content-type'])
    .toContain('text/calendar');
  const disposition = response.headers()['content-disposition'] ?? '';
  expect(disposition)
    .toMatch(/^attachment; filename=".+\.ics"$/);

  const body = await response.text();
  expect(body)
    .toContain('BEGIN:VCALENDAR');
  expect(body)
    .toContain('BEGIN:VEVENT');
}

test.describe('Calendar export', () => {
  test('edit page serves a downloadable .ics when dates are votable', async ({page, checkA11y}) => {
    await EditPage.createSession(page, ['2026-03-05T20:00']);

    const editPage = new EditPage(page);
    await expect(editPage.exportCalendarLink)
      .toBeVisible();
    await checkA11y();

    await assertCalendarExport(page, editPage.exportCalendarLink);
  });

  test('edit page hides the export link when no dates are proposed', async ({page, checkA11y}) => {
    await EditPage.createSession(page);

    const editPage = new EditPage(page);
    await expect(editPage.exportCalendarLink)
      .toHaveCount(0);

    await checkA11y();
  });

  test('join vote page serves the same downloadable .ics', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');
    await expect(joinPage.voteHeading)
      .toBeVisible();

    await expect(joinPage.exportCalendarLink)
      .toBeVisible();
    await checkA11y();

    await assertCalendarExport(page, joinPage.exportCalendarLink);
  });
});
