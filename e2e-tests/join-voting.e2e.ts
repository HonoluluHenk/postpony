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
  test('lets a new player join, cast and change a vote', async ({page, checkA11y}) => {
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

    await checkA11y();
  });

  test('remembers the player on return visits via localStorage', async ({page, checkA11y}) => {
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

    await checkA11y();
  });

  test('shows a message when no dates are proposed yet', async ({page, checkA11y}) => {
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

    await checkA11y();
  });

  test('rejects an invalid invitation token', async ({page, checkA11y}) => {
    const {id} = await createSession(page, 'Join Bad Token', true);

    const response = await page.goto(`/join/${id}/home?token=WRONG`);
    expect(response?.status())
      .toBe(403);
    await expect(page.getByRole('heading', {name: 'Error', level: 2}))
      .toBeVisible();
    await expect(page.getByRole('alert'))
      .toContainText('Invalid or missing invitation token');

    await checkA11y();
  });

  test('rejects an invalid team parameter', async ({page, checkA11y}) => {
    const {id, token} = await createSession(page, 'Join Bad Team', true);

    const response = await page.goto(`/join/${id}/spectator?token=${token}`);
    expect(response?.status())
      .toBe(400);
    await expect(page.getByRole('alert'))
      .toContainText('Invalid team');

    await checkA11y();
  });

  test('home team sees all proposed dates; away team only sees votable ones', async ({page, checkA11y}) => {
    const {id, token} = await createSession(page, 'Team Visibility', true);

    const editUrl = `/edit/${id}`;

    // Add a second proposed date
    await page.goto(editUrl);
    await page.getByLabel('Proposed Date & Time')
      .fill('2026-03-12T18:30');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();
    await expect(page.locator('#proposed-date-list')
      .getByRole('listitem'))
      .toHaveCount(2);

    // ponytail: beer.css hides native checkboxes; toggle via label text
    await page.getByText('Allow away team to vote')
      .nth(1)
      .click();

    // Join as away team
    const awayHref = `/join/${id}/away?token=${token}`;
    await page.goto(awayHref);
    await page.getByLabel('Or enter your name')
      .fill('AwayPlayer');
    await page.getByRole('button', {name: 'Continue'})
      .click();
    await expect(page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2}))
      .toBeVisible();

    // Away team should see only 1 date (the votable one)
    const voteForm = page.getByRole('form', {name: 'Vote on Proposed Dates'});
    await expect(voteForm.getByRole('group'))
      .toHaveCount(1);

    // Join as home team
    const homeHref = `/join/${id}/home?token=${token}`;
    await page.goto(homeHref);
    await page.getByLabel('Or enter your name')
      .fill('HomePlayer');
    await page.getByRole('button', {name: 'Continue'})
      .click();
    await expect(page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2}))
      .toBeVisible();

    // Home team should see both dates
    const homeVoteForm = page.getByRole('form', {name: 'Vote on Proposed Dates'});
    await expect(homeVoteForm.getByRole('group'))
      .toHaveCount(2);

    await checkA11y();
  });

  test('vote tally shows only own-team votes', async ({page, checkA11y}) => {
    const {id, token} = await createSession(page, 'Team Tally', true);

    const editUrl = `/edit/${id}`;

    // ponytail: beer.css hides native checkboxes; toggle via label text
    await page.goto(editUrl);
    await page.getByText('Allow away team to vote')
      .click();

    // Join as home player and vote Yes
    const homeHref = `/join/${id}/home?token=${token}`;
    await page.goto(homeHref);
    await page.getByLabel('Or enter your name')
      .fill('HomeVoter');
    await page.getByRole('button', {name: 'Continue'})
      .click();
    await expect(page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2}))
      .toBeVisible();
    const homeForm = page.getByRole('form', {name: 'Vote on Proposed Dates'});
    await homeForm.getByText('Yes', {exact: true})
      .click();
    await page.getByRole('button', {name: 'Submit Votes'})
      .click();

    // Join as away player and vote No
    const awayHref = `/join/${id}/away?token=${token}`;
    await page.goto(awayHref);
    await page.getByLabel('Or enter your name')
      .fill('AwayVoter');
    await page.getByRole('button', {name: 'Continue'})
      .click();
    await expect(page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2}))
      .toBeVisible();

    // Check tally: away team should see 0 home votes (only away votes = 0 so far)
    let tallySection = page.getByRole('region', {name: 'Vote Summary'});
    await expect(tallySection.getByRole('rowgroup')
      .last()
      .getByRole('row')
      .first()
      .getByRole('cell')
      .nth(1))
      .toHaveText('0'); // yes = 0 (no away-team votes yet)

    // Cast away team vote
    const awayForm = page.getByRole('form', {name: 'Vote on Proposed Dates'});
    await awayForm.getByText('No', {exact: true})
      .click();
    await page.getByRole('button', {name: 'Submit Votes'})
      .click();

    // Now away team tally should show 1 No (0 Yes, 0 Maybe)
    tallySection = page.getByRole('region', {name: 'Vote Summary'});
    await expect(tallySection.getByRole('rowgroup')
      .last()
      .getByRole('row')
      .first()
      .getByRole('cell')
      .nth(1))
      .toHaveText('0'); // yes
    await expect(tallySection.getByRole('rowgroup')
      .last()
      .getByRole('row')
      .first()
      .getByRole('cell')
      .nth(2))
      .toHaveText('0'); // maybe
    await expect(tallySection.getByRole('rowgroup')
      .last()
      .getByRole('row')
      .first()
      .getByRole('cell')
      .nth(3))
      .toHaveText('1'); // no

    await checkA11y();
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
