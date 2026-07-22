import type { Locator, Page } from '@playwright/test';
import { expect } from './fixtures';
import type { SessionFixture } from './test-session';

export async function createSession(page: Page, name?: string, dates?: string[]): Promise<SessionFixture> {
  await page.goto('/create');
  await page.getByLabel('Postponement Name')
    .fill(name ?? 'Test Session');
  await page.getByRole('button', {name: 'Create Postponement'})
    .click();
  await page.waitForURL(/\/edit\/.+/);

  const editUrl = page.url();

  for (const dt of dates ?? []) {
    await page.getByLabel('Proposed Date & Time')
      .fill(dt);
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();
    await expect(page.locator('#proposed-date-list')
      .getByRole('listitem'))
      .toHaveCount(1);
  }

  const homeHref = await page.locator('a[href*="/home?token="]')
    .getAttribute('href');
  if (!homeHref) {
    throw new Error('home invitation link was not rendered');
  }

  const awayHref = await page.locator('a[href*="/away?token="]')
    .getAttribute('href');
  if (!awayHref) {
    throw new Error('away invitation link was not rendered');
  }

  const url = new URL(homeHref);
  const id = url.pathname.split('/')[2] ?? '';
  const token = url.searchParams.get('token') ?? '';

  return {id, token, homeHref, awayHref, editUrl};
}

export function getVoteForm(page: Page): Locator {
  return page.getByRole('form', {name: 'Vote on Proposed Dates'});
}

export async function toggleAwayVotable(page: Page, dateIndex: number): Promise<void> {
  // ponytail: beer.css hides native checkboxes; toggle via label text
  await page.getByText('Allow away team to vote')
    .nth(dateIndex)
    .click();
}

export async function joinAsPlayer(page: Page, href: string, playerName: string): Promise<void> {
  await page.goto(href);
  await page.getByLabel('Or enter your name')
    .fill(playerName);
  await page.getByRole('button', {name: 'Continue'})
    .click();
  await expect(page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2}))
    .toBeVisible();
}

export async function castVote(voteForm: Locator, dateIndex: number, vote: 'Yes' | 'No' | 'Maybe'): Promise<void> {
  // ponytail: beer.css hides native radio inputs; toggle via label text
  await voteForm.getByRole('group')
    .nth(dateIndex)
    .getByText(vote, {exact: true})
    .click();
}
