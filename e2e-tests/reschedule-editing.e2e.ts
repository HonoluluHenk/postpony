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

  test('should maintain accessibility on the editing interface', async ({checkA11y}) => {
    await checkA11y();
  });
});
