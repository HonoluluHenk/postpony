import { expect, test } from './fixtures';

test.describe('Postponement Editing', () => {
  test.beforeEach(async ({page}) => {
    // Start by creating a session to edit
    await page.goto('/create');
    await page.getByLabel('Postponement Name')
      .fill('Edit Test Session');
    await page.getByRole('button', {name: 'Create Postponement'})
      .click();
    await expect(page.getByRole('heading', {name: 'Editing Postponement', level: 1}))
      .toContainText('Edit Test Session');
  });

  test('should update venue settings', async ({page, checkA11y}) => {
    const maxOverlapsInput = page.getByLabel('Maximum Overlapping Matches');
    await maxOverlapsInput.fill('3');
    await page.getByRole('button', {name: 'Update Venue Settings'})
      .click();

    // Verify success message
    await expect(page.getByText('Venue settings updated!'))
      .toBeVisible();
    await expect(maxOverlapsInput)
      .toHaveValue('3');

    await checkA11y();
  });

  test('should add players to the home team', async ({page, checkA11y}) => {
    const playerNameInput = page.getByLabel('New Player Name');
    await playerNameInput.fill('John Doe');
    await page.getByRole('button', {name: 'Add Player'})
      .click();

    // Verify player is in the list
    const playerList = page.getByRole('list', {name: 'Home Team Players'});
    await expect(playerList)
      .toContainText('John Doe');

    // Add another player
    await playerNameInput.fill('Jane Smith');
    await page.getByRole('button', {name: 'Add Player'})
      .click();
    await expect(playerList)
      .toContainText('Jane Smith');

    await checkA11y();
  });

  test('should add proposed postponement dates', async ({page, checkA11y}) => {
    const proposedDateTimeInput = page.getByLabel('Proposed Date & Time');
    await proposedDateTimeInput.fill('2026-03-05T20:00');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();

    // Verify the proposed date is in the list
    const proposedDateList = page.getByRole('list', {name: 'Proposed Dates'});
    await expect(proposedDateList)
      .toContainText('2026');

    // Add another proposed date
    await proposedDateTimeInput.fill('2026-03-12T18:30');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();
    await expect(proposedDateList.getByRole('listitem'))
      .toHaveCount(2);

    await checkA11y();
  });

  test('should show vote tallies on the edit page', async ({page, checkA11y}) => {
    // Add proposed dates
    await page.getByLabel('Proposed Date & Time')
      .fill('2026-06-01T20:00');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    await page.getByLabel('Proposed Date & Time')
      .fill('2026-06-15T18:30');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();
    await expect(page.getByRole('list', {name: 'Proposed Dates'})
      .getByRole('listitem'))
      .toHaveCount(2);

    const editUrl = page.url();

    // Join as Alice and vote
    const homeHref = await page.getByRole('link', {name: 'Home team invitation link'})
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

    const voteForm = page.getByRole('form', {name: 'Vote on Proposed Dates'});
    await voteForm.getByRole('group')
      .first()
      .getByText('Yes', {exact: true})
      .click();
    await voteForm.getByRole('group')
      .nth(1)
      .getByText('Maybe', {exact: true})
      .click();
    await page.getByRole('button', {name: 'Submit Votes'})
      .click();

    // Return to edit page and check home team tally
    await page.goto(editUrl);

    const homeTally = page.getByRole('region', {name: 'Home Team Votes'});
    await expect(homeTally.getByRole('heading', {level: 4}))
      .toContainText('Home Team Votes');

    const homeRows = homeTally.getByRole('rowgroup')
      .last()
      .getByRole('row');
    await expect(homeRows)
      .toHaveCount(2);

    // First date: Yes=1, Maybe=0, No=0
    await expect(homeRows.first()
      .getByRole('cell')
      .nth(1))
      .toHaveText('1');
    await expect(homeRows.first()
      .getByRole('cell')
      .nth(2))
      .toHaveText('0');
    await expect(homeRows.first()
      .getByRole('cell')
      .nth(3))
      .toHaveText('0');

    // Second date: Yes=0, Maybe=1, No=0
    await expect(homeRows.nth(1)
      .getByRole('cell')
      .nth(1))
      .toHaveText('0');
    await expect(homeRows.nth(1)
      .getByRole('cell')
      .nth(2))
      .toHaveText('1');
    await expect(homeRows.nth(1)
      .getByRole('cell')
      .nth(3))
      .toHaveText('0');

    await checkA11y();
  });

  test('should toggle away team voting visibility on proposed dates', async ({page, checkA11y}) => {
    // Add a proposed date
    await page.getByLabel('Proposed Date & Time')
      .fill('2026-03-05T20:00');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();
    await expect(page.locator('#proposed-date-list')
      .getByRole('listitem'))
      .toHaveCount(1);

    // ponytail: beer.css hides native checkboxes; toggle via label text
    const awayVoteLabel = page.getByText('Allow away team to vote');

    // Toggle it on
    await awayVoteLabel.click();
    await expect(awayVoteLabel)
      .toBeVisible();

    // Toggle it off
    await awayVoteLabel.click();
    await expect(awayVoteLabel)
      .toBeVisible();

    await checkA11y();
  });

  test('should show split team tallies on the edit page', async ({page, checkA11y}) => {
    // Add proposed dates
    await page.getByLabel('Proposed Date & Time')
      .fill('2026-06-01T20:00');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    await page.getByLabel('Proposed Date & Time')
      .fill('2026-06-15T18:30');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    const editUrl = page.url();

    // Make both dates votable for away team
    // ponytail: beer.css hides native checkboxes; toggle via label text
    await page.getByText('Allow away team to vote')
      .first()
      .click();
    await page.getByText('Allow away team to vote')
      .nth(1)
      .click();

    // Get invitation links
    const homeHref = await page.getByRole('link', {name: 'Home team invitation link'})
      .getAttribute('href');
    const awayHref = await page.getByRole('link', {name: 'Away team invitation link'})
      .getAttribute('href');
    if (!homeHref || !awayHref) {
      throw new Error('invitation links not found');
    }

    // Join as home player and vote Yes on first date
    await page.goto(homeHref);
    await page.getByLabel('Or enter your name')
      .fill('HomePlayer');
    await page.getByRole('button', {name: 'Continue'})
      .click();
    await expect(page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2}))
      .toBeVisible();

    const homeVoteForm = page.getByRole('form', {name: 'Vote on Proposed Dates'});
    await homeVoteForm.getByRole('group')
      .first()
      .getByText('Yes', {exact: true})
      .click();
    await page.getByRole('button', {name: 'Submit Votes'})
      .click();

    // Join as away player and vote No on first date
    await page.goto(awayHref);
    await page.getByLabel('Or enter your name')
      .fill('AwayPlayer');
    await page.getByRole('button', {name: 'Continue'})
      .click();
    await expect(page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2}))
      .toBeVisible();

    const awayVoteForm = page.getByRole('form', {name: 'Vote on Proposed Dates'});
    await awayVoteForm.getByRole('group')
      .first()
      .getByText('No', {exact: true})
      .click();
    await page.getByRole('button', {name: 'Submit Votes'})
      .click();

    // Return to edit page and check split tallies
    await page.goto(editUrl);

    // Home Team Votes tally
    const homeTallySection = page.getByRole('region', {name: 'Home Team Votes'});
    await expect(homeTallySection.getByRole('heading', {level: 4}))
      .toContainText('Home Team Votes');
    const homeTallyRows = homeTallySection.getByRole('rowgroup')
      .last()
      .getByRole('row');
    await expect(homeTallyRows.first()
      .getByRole('cell')
      .nth(1))
      .toHaveText('1'); // Yes = 1

    // Away Team Votes tally
    const awayTallySection = page.getByRole('region', {name: 'Away Team Votes'});
    await expect(awayTallySection.getByRole('heading', {level: 4}))
      .toContainText('Away Team Votes');
    const awayTallyRows = awayTallySection.getByRole('rowgroup')
      .last()
      .getByRole('row');
    await expect(awayTallyRows.first()
      .getByRole('cell')
      .nth(3))
      .toHaveText('1'); // No = 1

    await checkA11y();
  });

  test('should maintain accessibility on the editing interface', async ({checkA11y}) => {
    await checkA11y();
  });

  test('maintains accessibility on the edit page with split tallies visible', async ({page, checkA11y}) => {
    await page.getByLabel('Proposed Date & Time')
      .fill('2026-06-01T20:00');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();
    await page.getByLabel('Proposed Date & Time')
      .fill('2026-06-15T18:30');
    await page.getByRole('button', {name: 'Add Proposed Date'})
      .click();

    const homeHref = await page.getByRole('link', {name: 'Home team invitation link'})
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

    const voteForm = page.getByRole('form', {name: 'Vote on Proposed Dates'});
    await voteForm.getByRole('group')
      .first()
      .getByText('Yes', {exact: true})
      .click();
    await voteForm.getByRole('group')
      .nth(1)
      .getByText('No', {exact: true})
      .click();
    await page.getByRole('button', {name: 'Submit Votes'})
      .click();

    await page.goto(editUrl);
    await checkA11y();
  });
});
