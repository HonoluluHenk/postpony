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
    await editPage.toggleVotableByOpponent(0);
    await expect(editPage.votableByOpponentToggle(0))
      .toBeVisible();

    // Toggle it off
    await editPage.toggleVotableByOpponent(0);
    await expect(editPage.votableByOpponentToggle(0))
      .toBeVisible();

    await editPage.toggleVotableByOpponent(0);
    await expect(editPage.votableByOpponentToggle(0))
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
    await editPage.toggleVotableByOpponent(0);
    await expect(editPage.votableByOpponentToggle(0))
      .toBeVisible();
    await editPage.toggleVotableByOpponent(1);

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

  test('should show own-team per-player votes and the N/M voted count in the edit view', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-06-01T20:00');
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();
    await editPage.addProposedDate('2026-06-15T18:30');
    await expect(page.getByRole('alert')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    // Roster: two home players; Jane Smith never joins.
    await editPage.addPlayer('John Doe');
    await expect(editPage.playerItem('John Doe'))
      .toBeVisible();
    await editPage.addPlayer('Jane Smith');
    await expect(editPage.playerItem('Jane Smith'))
      .toBeVisible();

    const editUrl = page.url();

    // An organizer-team member votes via the own-team link.
    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('John Doe');
    await joinPage.castVote(0, 'Yes');
    await joinPage.castVote(1, 'No');
    await joinPage.submitVotes();

    await page.goto(editUrl);

    const ownTeam = editPage.ownTeamSection();
    await expect(ownTeam.getByRole('heading', {level: 3}))
      .toContainText('Your Team Votes');

    const bodyRows = ownTeam.getByRole('rowgroup')
      .last()
      .getByRole('row');

    // Date 1: John Doe voted Yes, Jane Smith has no vote, 1/2 voted.
    const dateRow1 = bodyRows.nth(0);
    await expect(dateRow1.getByRole('cell')
      .nth(0))
      .toHaveText('Yes');
    await expect(dateRow1.getByRole('cell')
      .nth(1))
      .toContainText('No vote');
    await expect(dateRow1.getByRole('cell')
      .nth(2))
      .toHaveText('1/2 voted');

    // The non-voter row marks Jane Smith as not joined.
    await expect(bodyRows.nth(1)
      .getByRole('cell')
      .first())
      .toContainText('Jane Smith');
    await expect(bodyRows.nth(1)
      .getByRole('cell')
      .first())
      .toContainText('not joined');

    // Date 2: John Doe voted No, still 1/2 voted.
    await expect(bodyRows.nth(2)
      .getByRole('cell')
      .nth(0))
      .toHaveText('No');
    await expect(bodyRows.nth(2)
      .getByRole('cell')
      .nth(2))
      .toHaveText('1/2 voted');

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

  test('should confirm a proposed date, lock the session, and show the reopen control', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-06-01T20:00');
    await expect(editPage.proposedDateList.getByRole('listitem'))
      .toHaveCount(1);

    // No confirm control until the date is proposed to the opponent.
    await expect(editPage.proposedDateList.getByRole('button', {name: 'Confirm'}))
      .toHaveCount(0);

    await editPage.toggleVotableByOpponent(0);
    await expect(editPage.confirmButton(0))
      .toBeVisible();

    await editPage.confirmDate(0);

    await expect(editPage.status)
      .toContainText('Confirmed');
    await expect(editPage.reopenButton())
      .toBeVisible();
    // Date-management controls are gone once locked.
    await expect(editPage.proposedDateList)
      .toHaveCount(0);
    await expect(editPage.proposedDateTimeInput)
      .toHaveCount(0);

    await checkA11y();
  });

  test('should reopen a confirmed postponement and start new dates non-votable', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-06-01T20:00');
    await editPage.toggleVotableByOpponent(0);
    await editPage.confirmDate(0);
    await expect(editPage.status)
      .toContainText('Confirmed');

    await editPage.reopen();

    await expect(editPage.status)
      .toContainText('Voting');
    await expect(editPage.reopenedCountNote())
      .toContainText('Reopened 1 time(s)');
    // The previously proposed date keeps its opponent flag.
    await expect(editPage.votableCheckbox(0))
      .toBeChecked();

    // A new date added after the reopen starts non-votable until flipped.
    await editPage.addProposedDate('2026-06-15T18:30');
    await expect(editPage.proposedDateList.getByRole('listitem'))
      .toHaveCount(2);
    await expect(editPage.votableCheckbox(1))
      .not
      .toBeChecked();

    await checkA11y();
  });
});
