import { expect, test } from './fixtures';
import { EditPage, JoinPage } from './pages';
import type { SessionFixture } from './test-session';

test.describe('Postponement Editing', () => {
  let session: SessionFixture;

  test.beforeEach(async ({page}) => {
    ({session} = await EditPage.createSession(page, 'Edit Test Session'));
  });

  test('should add players to the home team', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    await editPage.addPlayer('John Doe');

    // Verify player is in the list
    await expect(editPage.playerItem('John Doe'))
      .toBeVisible();

    // Add another player
    await editPage.addPlayer('Jane Smith');
    await expect(editPage.playerItem('Jane Smith'))
      .toBeVisible();

    await checkA11y();
  });

  test('should add proposed postponement dates', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-03-05T20:00');

    // Verify the proposed date is in the list
    await expect(editPage.proposedDateList)
      .toContainText('2026');

    // Add another proposed date
    await editPage.addProposedDate('2026-03-12T18:30');
    await expect(editPage.proposedDateList.getByRole('listitem'))
      .toHaveCount(2);

    await checkA11y();
  });

  test('should show vote tallies on the edit page', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    // Add proposed dates
    await editPage.addProposedDate('2026-06-01T20:00');
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    await editPage.addProposedDate('2026-06-15T18:30');
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    const editUrl = page.url();

    // Join as Alice and vote
    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');
    await joinPage.castVote(0, 'Yes');
    await joinPage.castVote(1, 'Maybe');
    await joinPage.submitVotes();

    // Return to edit page and check home team tally
    await page.goto(editUrl);

    const homeTally = editPage.homeTallySection();
    await expect(homeTally.getByRole('heading', {level: 3}))
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
    const editPage = new EditPage(page);
    // Add a proposed date
    await editPage.addProposedDate('2026-03-05T20:00');
    await expect(page.locator('#proposed-date-list')
      .getByRole('listitem'))
      .toHaveCount(1);

    // Toggle it on
    await editPage.toggleAwayVotable(0);
    await expect(editPage.awayVoteToggle(0))
      .toBeVisible();

    // Toggle it off
    await editPage.toggleAwayVotable(0);
    await expect(editPage.awayVoteToggle(0))
      .toBeVisible();

    await editPage.toggleAwayVotable(0);
    await expect(editPage.awayVoteToggle(0))
      .toBeVisible();

    await checkA11y();
  });

  test('should show split team tallies on the edit page', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    // Add proposed dates
    await editPage.addProposedDate('2026-06-01T20:00');
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    await editPage.addProposedDate('2026-06-15T18:30');
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    const editUrl = page.url();

    // Make both dates votable for away team
    await editPage.toggleAwayVotable(0);
    await expect(editPage.awayVoteToggle(0))
      .toBeVisible();
    await editPage.toggleAwayVotable(1);

    // Join as home player and vote Yes on first date
    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('HomePlayer');
    await joinPage.castVote(0, 'Yes');
    await joinPage.castVote(1, 'No');
    await joinPage.submitVotes();

    // Join as away player and vote No on first date
    await joinPage.goto(session.awayHref);
    await joinPage.join('AwayPlayer');
    await joinPage.castVote(0, 'No');
    await joinPage.castVote(1, 'Yes');
    await joinPage.submitVotes();

    // Return to edit page and check split tallies
    await page.goto(editUrl);

    // Home Team Votes tally
    const homeTallySection = editPage.homeTallySection();
    await expect(homeTallySection.getByRole('heading', {level: 3}))
      .toContainText('Home Team Votes');
    const homeTallyRows = homeTallySection.getByRole('rowgroup')
      .last()
      .getByRole('row');
    await expect(homeTallyRows.first()
      .getByRole('cell')
      .nth(1))
      .toHaveText('1'); // Yes = 1

    // Away Team Votes tally
    const awayTallySection = editPage.awayTallySection();
    await expect(awayTallySection.getByRole('heading', {level: 3}))
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
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-06-01T20:00');
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    await editPage.addProposedDate('2026-06-15T18:30');
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    const editUrl = page.url();

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');
    await joinPage.castVote(0, 'Yes');
    await joinPage.castVote(1, 'No');
    await joinPage.submitVotes();

    await page.goto(editUrl);
    await checkA11y();
  });
});
