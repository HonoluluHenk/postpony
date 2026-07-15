import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

interface JoinSetup {
  id: string;
  token: string;
  homeHref: string;
}

async function createSession(page: Page, name: string, withProposedDate: boolean): Promise<JoinSetup> {
  await page.goto('/create');
  await page.getByLabel('Postponement Name')
    .fill(name);
  await page.getByRole('button', {name: 'Create Postponement'})
    .click();
  await page.waitForURL(/\/edit\/.+/);

  if (withProposedDate) {
    await page.getByLabel('Proposed Date & Time')
      .fill('2026-03-05T20:00');
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

  const url = new URL(homeHref);
  const id = url.pathname.split('/')[2] ?? '';
  const token = url.searchParams.get('token') ?? '';

  return {id, token, homeHref};
}

test.describe('Join and Voting', () => {
  test('lets a new player join, cast and change a vote', async ({page}) => {
    const {homeHref} = await createSession(page, 'Join Happy Path', true);

    // Step 1: identify with a brand-new name.
    await page.goto(homeHref);
    await expect(page.getByRole('heading', {name: 'Join the Postponement', level: 2}))
      .toBeVisible();
    await page.getByLabel('Or enter your name')
      .fill('Alice');
    await page.getByRole('button', {name: 'Continue'})
      .click();

    // Step 2: cast a vote. beer.css visually hides the radio input, so we toggle
    // it via its label text (scoped to the form to avoid the summary table headers).
    await expect(page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2}))
      .toBeVisible();
    const voteForm = page.locator('form');
    await voteForm.getByText('Yes', {exact: true})
      .click();
    await page.getByRole('button', {name: 'Submit Votes'})
      .click();

    await expect(page.getByText('Your votes have been saved!'))
      .toBeVisible();
    await expect(page.getByRole('radio', {name: 'Yes'}))
      .toBeChecked();

    // Change the vote and resubmit.
    await voteForm.getByText('No', {exact: true})
      .click();
    await page.getByRole('button', {name: 'Submit Votes'})
      .click();

    await expect(page.getByRole('radio', {name: 'No'}))
      .toBeChecked();
    await expect(page.getByRole('radio', {name: 'Yes'}))
      .not
      .toBeChecked();
  });

  test('remembers the player on return visits via localStorage', async ({page}) => {
    const {homeHref} = await createSession(page, 'Join Return Visit', true);

    await page.goto(homeHref);
    await page.getByLabel('Or enter your name')
      .fill('Bob');
    await page.getByRole('button', {name: 'Continue'})
      .click();
    await expect(page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2}))
      .toBeVisible();

    // Revisiting the plain join link auto-redirects to the vote step for the stored player.
    await page.goto(homeHref);
    await page.waitForURL(/\/vote\?playerId=.+/);
    await expect(page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2}))
      .toBeVisible();
  });

  test('shows a message when no dates are proposed yet', async ({page}) => {
    const {homeHref} = await createSession(page, 'Join No Dates', false);

    await page.goto(homeHref);
    await page.getByLabel('Or enter your name')
      .fill('Carol');
    await page.getByRole('button', {name: 'Continue'})
      .click();

    await expect(page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2}))
      .toBeVisible();
    await expect(page.getByText('No dates have been proposed yet'))
      .toBeVisible();
    await expect(page.getByRole('button', {name: 'Submit Votes'}))
      .toHaveCount(0);
  });

  test('rejects an invalid invitation token', async ({page}) => {
    const {id} = await createSession(page, 'Join Bad Token', true);

    const response = await page.goto(`/join/${id}/home?token=WRONG`);
    expect(response?.status())
      .toBe(403);
    await expect(page.getByRole('heading', {name: 'Error', level: 2}))
      .toBeVisible();
    await expect(page.getByRole('alert'))
      .toContainText('Invalid or missing invitation token');
  });

  test('rejects an invalid team parameter', async ({page}) => {
    const {id, token} = await createSession(page, 'Join Bad Team', true);

    const response = await page.goto(`/join/${id}/spectator?token=${token}`);
    expect(response?.status())
      .toBe(400);
    await expect(page.getByRole('alert'))
      .toContainText('Invalid team');
  });

  test('join and vote steps are accessible', async ({page, checkA11y}) => {
    const {homeHref} = await createSession(page, 'Join A11y', true);

    await page.goto(homeHref);
    await expect(page.getByRole('heading', {name: 'Join the Postponement', level: 2}))
      .toBeVisible();
    await checkA11y();

    await page.getByLabel('Or enter your name')
      .fill('Dora');
    await page.getByRole('button', {name: 'Continue'})
      .click();
    await expect(page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2}))
      .toBeVisible();
    await checkA11y();
  });
});
