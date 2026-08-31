import { expect, test } from './fixtures';
import { EditPage, JoinPage } from './pages';
import type { SessionFixture } from './test-session';

test.describe('Postponement Editing', () => {
  let session: SessionFixture;

  test.beforeEach(async ({page}) => {
    ({session} = await EditPage.createSession(page));
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
    await expect(editPage.proposedDateRows)
      .toHaveCount(2);

    await checkA11y();
    await expect(page)
      .toHaveScreenshot('edit-with-dates.png', {fullPage: true});
  });

  test('should render proposed dates chronologically on the edit and vote pages regardless of the order they were added', async ({
                                                                                                                                   page,
                                                                                                                                   checkA11y,
                                                                                                                                 }) => {
    const {session} = await EditPage.createSession(page, [
      '2026-03-12T18:30',
      '2026-03-05T20:00',
    ]);
    const editPage = new EditPage(page);

    await expect(editPage.proposedDateDisplays())
      .resolves
      .toEqual([
        expect.stringContaining('Mar 5'),
        expect.stringContaining('Mar 12'),
      ]);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');

    await expect(joinPage.voteForm.getByRole('group')
      .nth(0))
      .toContainText('Mar 5');
    await expect(joinPage.voteForm.getByRole('group')
      .nth(1))
      .toContainText('Mar 12');

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
    await expect(page)
      .toHaveScreenshot('edit-with-votes.png', {fullPage: true});
  });

  test('should toggle voting visibility on proposed dates', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    // Add a proposed date
    await editPage.addProposedDate('2026-03-05T20:00');
    await expect(page.locator('#proposed-date-list > .proposed-date-card'))
      .toHaveCount(1);

    // Dates are votable by both teams out of the box.
    await expect(editPage.votableCheckbox(0))
      .toBeChecked();

    // Toggle it off
    await editPage.toggleVotable(0);
    await expect(editPage.votableCheckbox(0))
      .not
      .toBeChecked();

    // Toggle it back on
    await editPage.toggleVotable(0);
    await expect(editPage.votableCheckbox(0))
      .toBeChecked();

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

    // Roster: 3 scraped players + John Doe + Jane Smith = 5. Only John Doe
    // votes, so every date reports 1 of 5 voted.
    await expect(ownTeam.getByRole('table')
      .getByText('1/5 voted'))
      .toHaveCount(2);

    // John Doe's per-player cells: a Yes on date 1 and a No on date 2. The
    // other four players' cells are all "No vote".
    await expect(ownTeam.getByRole('cell', {name: 'Yes', exact: true}))
      .toHaveCount(1);
    await expect(ownTeam.getByRole('cell', {name: 'No', exact: true}))
      .toHaveCount(1);
    await expect(ownTeam.getByRole('cell', {name: 'No vote', exact: true}))
      .toHaveCount(8);

    // The non-voter rows (one per date) mark the never-joining players (incl.
    // Jane Smith) as not joined.
    const nonVotersRows = ownTeam.getByRole('row')
      .filter({hasText: 'Not voted yet:'});
    await expect(nonVotersRows)
      .toHaveCount(2);
    await expect(nonVotersRows.first())
      .toContainText('Jane Smith');
    await expect(nonVotersRows.first())
      .toContainText('not joined');

    await checkA11y();
  });

  test('should maintain accessibility on the editing interface', async ({page, checkA11y}) => {
    await checkA11y();
    await expect(page)
      .toHaveScreenshot('edit-empty.png', {fullPage: true});
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
    await expect(editPage.proposedDateRows)
      .toHaveCount(1);

    // Dates are votable by both teams out of the box, so the confirm control
    // is present immediately.
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
    await expect(page)
      .toHaveScreenshot('edit-confirmed.png', {fullPage: true});
  });

  test('should reopen a confirmed postponement; new dates stay votable', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-06-01T20:00');
    await editPage.confirmDate(0);
    await expect(editPage.status)
      .toContainText('Confirmed');

    await editPage.reopen();

    await expect(editPage.status)
      .toContainText('Voting');
    await expect(editPage.reopenedCountNote())
      .toContainText('Reopened 1 time(s)');
    // The previously proposed date keeps its votable flag.
    await expect(editPage.votableCheckbox(0))
      .toBeChecked();

    // A new date added after the reopen is votable too — dates start votable
    // for both teams and the organizer may close specific ones.
    await editPage.addProposedDate('2026-06-15T18:30');
    await expect(editPage.proposedDateRows)
      .toHaveCount(2);
    await expect(editPage.votableCheckbox(1))
      .toBeChecked();

    await checkA11y();
  });

  test('should delete a proposed date after confirming in a dialog, removing its votes', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-06-01T20:00');
    await expect(editPage.proposedDateRows)
      .toHaveCount(1);
    await editPage.addProposedDate('2026-06-15T18:30');
    await expect(editPage.proposedDateRows)
      .toHaveCount(2);

    // A home-team voter casts a Yes on the first date and a No on the second
    // (the vote form requires a vote on every proposed date).
    const joinPage = new JoinPage(page);
    await joinPage.goto(session.homeHref);
    await joinPage.join('Alice');
    await joinPage.castVote(0, 'Yes');
    await joinPage.castVote(1, 'No');
    await joinPage.submitVotes();

    await editPage.goto(session.editUrl);
    await expect(editPage.homeTallyTable()
      .getByRole('row')
      .nth(1)
      .getByRole('cell')
      .nth(1))
      .toHaveText('1'); // yes

    await editPage.deleteButton(0)
      .click();

    // The confirmation dialog appears before anything is deleted.
    await expect(editPage.deleteDialog(0))
      .toBeVisible();
    await expect(editPage.proposedDateRows)
      .toHaveCount(2);

    await editPage.deleteConfirmButton(0)
      .click();

    await expect(editPage.proposedDateRows)
      .toHaveCount(1);
    await expect(editPage.deleteDialog(0))
      .toHaveCount(0);
    // The deleted date's tally is gone: only the surviving date remains.
    await expect(editPage.homeTallyTable()
      .getByRole('row'))
      .toHaveCount(2);

    await checkA11y();
  });

  test('should cancel deleting a proposed date, leaving the list untouched', async ({page}) => {
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-06-01T20:00');
    await expect(editPage.proposedDateRows)
      .toHaveCount(1);

    await editPage.deleteButton(0)
      .click();
    await expect(editPage.deleteDialog(0))
      .toBeVisible();
    await editPage.deleteCancelButton(0)
      .click();

    await expect(editPage.proposedDateRows)
      .toHaveCount(1);
    await expect(editPage.deleteDialog(0))
      .toHaveCount(0);
  });

  test('cancelling a proposed-date delete must not leave the global spinner stuck', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-06-01T20:00');
    await expect(editPage.proposedDateRows)
      .toHaveCount(1);

    // Opening and cancelling the delete dialog is a pure client-side action;
    // it must not trigger a misleading "loading a page" overlay.
    await editPage.deleteButton(0)
      .click();
    await expect(editPage.deleteDialog(0))
      .toBeVisible();
    await editPage.deleteCancelButton(0)
      .click();

    await expect(editPage.deleteDialog(0))
      .toHaveCount(0);
    await expect(editPage.spinner)
      .toBeHidden();

    // The list is still intact and interactive.
    await expect(editPage.proposedDateRows)
      .toHaveCount(1);

    await checkA11y();
  });

  test('deleting a proposed date clears the spinner once the htmx swap completes', async ({page}) => {
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-06-01T20:00');
    await expect(editPage.proposedDateRows)
      .toHaveCount(1);

    await editPage.deleteProposedDate(0);

    // The date is removed and the overlay is not left hanging.
    await expect(editPage.proposedDateRows)
      .toHaveCount(0);
    await expect(editPage.spinner)
      .toBeHidden();
  });


  test('edit page shows the referenced Match read-only with no change action', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);

    // The scraped match (Ostermundigen vs Thun, 14.01.2027) is shown read-only.
    await expect(editPage.matchSummary)
      .toContainText('Match: Ostermundigen vs Thun');
    await expect(editPage.matchSummary)
      .toContainText('01/14/2027');

    // No change-match affordance remains: no "change match details" link and
    // no path back into the wizard from the edit page.
    await expect(editPage.changeMatchDetailsLink)
      .toHaveCount(0);
    await expect(page.getByRole('link', {name: 'Find the match on click-tt.ch instead'}))
      .toHaveCount(0);

    await checkA11y();
  });
});
