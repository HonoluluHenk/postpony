import { expect, test } from './fixtures';

test.describe('Postponement Editing', () => {
  test.beforeEach(async ({page}) => {
    // Start by creating a session to edit
    await page.goto('/create');
    await page.getByLabel('Postponement Name')
      .fill('Edit Test Session');
    await page.getByRole('button', {name: 'Create Postponement'})
      .click();
    await expect(page.getByRole('heading', {name: 'Editing Postponement', level: 2}))
      .toContainText('Edit Test Session');
  });

  test('should update venue settings', async ({page}) => {
    const maxOverlapsInput = page.getByLabel('Maximum Overlapping Matches');
    await maxOverlapsInput.fill('3');
    await page.getByRole('button', {name: 'Update Venue Settings'})
      .click();

    // Verify success message
    await expect(page.getByText('Venue settings updated!'))
      .toBeVisible();
    await expect(maxOverlapsInput)
      .toHaveValue('3');
  });

  test('should add players to the home team', async ({page}) => {
    const playerNameInput = page.getByLabel('New Player Name');
    await playerNameInput.fill('John Doe');
    await page.getByRole('button', {name: 'Add Player'})
      .click();

    // Verify player is in the list
    const playerList = page.locator('#player-list');
    await expect(playerList)
      .toContainText('John Doe');

    // Add another player
    await playerNameInput.fill('Jane Smith');
    await page.getByRole('button', {name: 'Add Player'})
      .click();
    await expect(playerList)
      .toContainText('Jane Smith');
  });

  test('should add proposed postponement dates', async ({page}) => {
    const proposedDateTimeInput = page.getByLabel('Proposed Date & Time');
    await proposedDateTimeInput.fill('2026-03-05T20:00');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();

    // Verify the proposed date is in the list
    const proposedDateList = page.locator('#proposed-date-list');
    await expect(proposedDateList)
      .toContainText('2026');

    // Add another proposed date
    await proposedDateTimeInput.fill('2026-03-12T18:30');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();
    await expect(proposedDateList.getByRole('listitem'))
      .toHaveCount(2);
  });

  test('should show vote tallies on the edit page', async ({page}) => {
    // Add proposed dates
    await page.locator('#proposedDateTime')
      .fill('2026-06-01T20:00');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    await page.locator('#proposedDateTime')
      .fill('2026-06-15T18:30');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();
    await expect(page.locator('#proposed-date-list')
      .getByRole('listitem'))
      .toHaveCount(2);

    const editUrl = page.url();

    // Join as Alice and vote
    const homeHref = await page.locator('a[href*="/home?token="]')
      .getAttribute('href');
    if (!homeHref) {
      throw new Error('home invitation link not found');
    }
    await page.goto(homeHref);

    await page.getByLabel('Or enter your name')
      .fill('Alice');
    await page.getByRole('button', {name: 'Continue'})
      .click();
    await expect(page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2}))
      .toBeVisible();

    const voteForm = page.locator('form');
    await voteForm.locator('fieldset')
      .first()
      .getByText('Yes', {exact: true})
      .click();
    await voteForm.locator('fieldset')
      .nth(1)
      .getByText('Maybe', {exact: true})
      .click();
    await page.getByRole('button', {name: 'Submit Votes'})
      .click();

    // Return to edit page and check tally
    await page.goto(editUrl);

    const tallySection = page.locator('#vote-tally-section');
    await expect(tallySection.getByRole('heading', {level: 4}))
      .toContainText('Vote Summary');

    const tallyRows = tallySection.locator('tbody tr');
    await expect(tallyRows)
      .toHaveCount(2);

    // First date: Yes=1, Maybe=0, No=0
    await expect(tallyRows.first()
      .locator('td')
      .nth(1))
      .toHaveText('1');
    await expect(tallyRows.first()
      .locator('td')
      .nth(2))
      .toHaveText('0');
    await expect(tallyRows.first()
      .locator('td')
      .nth(3))
      .toHaveText('0');

    // Second date: Yes=0, Maybe=1, No=0
    await expect(tallyRows.nth(1)
      .locator('td')
      .nth(1))
      .toHaveText('0');
    await expect(tallyRows.nth(1)
      .locator('td')
      .nth(2))
      .toHaveText('1');
    await expect(tallyRows.nth(1)
      .locator('td')
      .nth(3))
      .toHaveText('0');
  });

  test('should maintain accessibility on the editing interface', async ({checkA11y}) => {
    await checkA11y();
  });

  test('maintains accessibility on the edit page with the vote tally visible', async ({page, checkA11y}) => {
    await page.locator('#proposedDateTime')
      .fill('2026-06-01T20:00');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();
    await page.locator('#proposedDateTime')
      .fill('2026-06-15T18:30');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();

    const homeHref = await page.locator('a[href*="/home?token="]')
      .getAttribute('href');
    if (!homeHref) {
      throw new Error('home invitation link not found');
    }
    const editUrl = page.url();
    await page.goto(homeHref);

    await page.getByLabel('Or enter your name')
      .fill('Alice');
    await page.getByRole('button', {name: 'Continue'})
      .click();

    const voteForm = page.locator('form');
    await voteForm.locator('fieldset')
      .first()
      .getByText('Yes', {exact: true})
      .click();
    await voteForm.locator('fieldset')
      .nth(1)
      .getByText('No', {exact: true})
      .click();
    await page.getByRole('button', {name: 'Submit Votes'})
      .click();

    await page.goto(editUrl);
    await checkA11y();
  });
});
