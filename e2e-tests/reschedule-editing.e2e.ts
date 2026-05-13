import { expect, test } from './fixtures';

test.describe('Reschedule Editing', () => {
  test.beforeEach(async ({page}) => {
    // Start by creating a session to edit
    await page.goto('/create');
    await page.getByLabel('ReSchedule Name')
      .fill('Edit Test Session');
    await page.getByRole('button', {name: 'Create ReSchedule'})
      .click();
    await expect(page.getByRole('heading', {name: 'Editing ReSchedule', level: 2}))
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
    const playerList = page.getByRole('list');
    await expect(playerList)
      .toContainText('John Doe');

    // Add another player
    await playerNameInput.fill('Jane Smith');
    await page.getByRole('button', {name: 'Add Player'})
      .click();
    await expect(playerList)
      .toContainText('Jane Smith');
  });

  test('should maintain accessibility on the editing interface', async ({page, checkA11y}) => {
    await checkA11y();
  });
});
