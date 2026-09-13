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

    // The shared visually-hidden status element announces the short outcome.
    await expect(editPage.clipboardStatus)
      .toHaveText('Player added');

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

    // The shared visually-hidden status element announces the short outcome.
    await expect(editPage.clipboardStatus)
      .toHaveText('Proposed date added!');

    // Verify the proposed date is in the rail
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
        expect.stringContaining('March 5 2026'),
        expect.stringContaining('March 12 2026'),
      ]);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');

    await expect(joinPage.voteForm.locator('.vote-radio-group')
      .nth(0))
      .toContainText('Mar 5');
    await expect(joinPage.voteForm.locator('.vote-radio-group')
      .nth(1))
      .toContainText('Mar 12');

    await checkA11y();
  });

  test('should group proposed dates into one week header per ISO week', async ({page, checkA11y}) => {
    // 2026-03-05 (ISO week 10) and 2026-03-12 (ISO week 11) fall in two weeks.
    await EditPage.createSession(page, [
      '2026-03-05T20:00',
      '2026-03-12T18:30',
    ]);
    const editPage = new EditPage(page);

    await expect(editPage.weekHeads)
      .toHaveCount(2);
    await expect(editPage.weekHeads.nth(0))
      .toContainText('Week 10');
    await expect(editPage.weekHeads.nth(1))
      .toContainText('Week 11');

    await checkA11y();
  });

  test('should show vote dots on the edit page', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    // Add proposed dates
    await editPage.addProposedDate('2026-06-01T20:00');
    await expect(page.locator('.toast.success')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    await editPage.addProposedDate('2026-06-15T18:30');
    await expect(page.locator('.toast.success')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    const editUrl = page.url();

    // Join as Alice and vote
    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');
    await joinPage.castVote(0, 'Yes');
    await joinPage.castVote(1, 'IfNecessary');

    // Return to edit page; the vote dots are inline (no disclosure to open).
    await page.goto(editUrl);

    // Roster: 3 scraped organizer-team players + Alice = 4. Alice votes on
    // both dates, so each reads 1 of 4 voted.
    const firstRow = editPage.proposedDateRows.nth(0);
    await expect(firstRow.locator('.vote-dot-count'))
      .toHaveText('1/4 voted');
    await expect(firstRow.locator('.vote-dot--yes'))
      .toHaveCount(1);
    await expect(firstRow.locator('.vote-dot--none'))
      .toHaveCount(3);

    const secondRow = editPage.proposedDateRows.nth(1);
    await expect(secondRow.locator('.vote-dot-count'))
      .toHaveText('1/4 voted');
    await expect(secondRow.locator('.vote-dot--ifnecessary'))
      .toHaveCount(1);

    await checkA11y();
    await expect(page)
      .toHaveScreenshot('edit-with-votes.png', {fullPage: true});
  });

  test('should show an empty vote as unvoted dots and a 0/M count', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-06-01T20:00');
    await expect(editPage.proposedDateRows)
      .toHaveCount(1);

    // No player has voted: all dots are unvoted and the count is 0 of the
    // 3 scraped organizer-team players.
    const row = editPage.proposedDateRows.nth(0);
    await expect(row.locator('.vote-dot-count'))
      .toHaveText('0/3 voted');
    await expect(row.locator('.vote-dot--none'))
      .toHaveCount(3);
    await expect(row.locator('.vote-dot--yes, .vote-dot--no, .vote-dot--ifnecessary'))
      .toHaveCount(0);

    await checkA11y();
  });

  test('should toggle voting visibility on proposed dates', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    // Add a proposed date
    await editPage.addProposedDate('2026-03-05T20:00');
    await expect(page.locator('#proposed-dates-management .date-row'))
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

  test('should show own-team per-player votes and the N/M voted count in the edit view', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-06-01T20:00');
    await expect(editPage.proposedDateRows)
      .toHaveCount(1);
    await editPage.addProposedDate('2026-06-15T18:30');
    await expect(editPage.proposedDateRows)
      .toHaveCount(2);

    // Roster: two home players; Jane Smith never joins.
    await editPage.addPlayer('John Doe');
    await expect(editPage.clipboardStatus)
      .toHaveText('Player added');
    await expect(editPage.playerItem('John Doe'))
      .toBeVisible();
    await editPage.addPlayer('Jane Smith');
    await expect(editPage.clipboardStatus)
      .toHaveText('Player added');
    await expect(editPage.playerItem('Jane Smith'))
      .toBeVisible();

    const editUrl = page.url();

    // An organizer-team member votes via the own-team link.
    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('John Doe');
    await joinPage.castVote(0, 'Yes');
    await joinPage.castVote(1, 'No');

    await page.goto(editUrl);

    // Roster: 3 scraped players + John Doe + Jane Smith = 5. Only John Doe
    // votes, so every date reports 1 of 5 voted.
    const firstRow = editPage.proposedDateRows.nth(0);
    await expect(firstRow.locator('.vote-dot-count'))
      .toHaveText('1/5 voted');
    // John Doe's Yes on date 1; the other four players' dots are unvoted.
    await expect(firstRow.locator('.vote-dot--yes'))
      .toHaveCount(1);
    await expect(firstRow.locator('.vote-dot--yes'))
      .toHaveAttribute('title', 'John Doe: Yes');
    await expect(firstRow.locator('.vote-dot--none'))
      .toHaveCount(4);

    const secondRow = editPage.proposedDateRows.nth(1);
    await expect(secondRow.locator('.vote-dot-count'))
      .toHaveText('1/5 voted');
    await expect(secondRow.locator('.vote-dot--no'))
      .toHaveAttribute('title', 'John Doe: No');

    await checkA11y();
  });

  test('opens the players disclosure with Enter and Space on its summary', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-06-01T20:00');
    await expect(page.locator('.toast.success')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    // The redesigned sidebar keeps roster/generator in native <details>. The
    // players disclosure is open by default on desktop; close it first, then
    // toggle it back via keyboard on its summary.
    const playersDetails = page.locator('details.side-details', {hasText: 'Players'});
    const playersSummary = playersDetails.locator('summary');
    await expect(playersDetails)
      .toHaveAttribute('open', '');
    await playersSummary.click();
    await expect(playersDetails)
      .not
      .toHaveAttribute('open');

    // Enter opens it.
    await playersSummary.focus();
    await page.keyboard.press('Enter');
    await expect(playersDetails)
      .toHaveAttribute('open');

    // Space toggles it closed again.
    await page.keyboard.press(' ');
    await expect(playersDetails)
      .not
      .toHaveAttribute('open');

    // Space opens it again.
    await page.keyboard.press(' ');
    await expect(playersDetails)
      .toHaveAttribute('open');

    await checkA11y();
  });

  test('should maintain accessibility on the editing interface', async ({page, checkA11y}) => {
    await checkA11y();
    // Language selector is a ≥24px tap target with explicit colors.
    await expect(page.locator('#language-select'))
      .toHaveCSS('min-height', '24px');
    await expect(page)
      .toHaveScreenshot('edit-empty.png', {fullPage: true});
  });

  test('maintains accessibility on the edit page with votes visible', async ({page, checkA11y}) => {
    const editPage = new EditPage(page);
    await editPage.addProposedDate('2026-06-01T20:00');
    await expect(page.locator('.toast.success')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    await editPage.addProposedDate('2026-06-15T18:30');
    await expect(page.locator('.toast.success')
      .filter({hasText: 'Proposed date added!'}))
      .toBeVisible();

    const editUrl = page.url();

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');
    await joinPage.castVote(0, 'Yes');
    await joinPage.castVote(1, 'No');

    await page.goto(editUrl);
    await checkA11y();
  });

  test('should show clean and clash chips on the right date rows', async ({page, checkA11y}) => {
    // A clean date sorts first, a clashing date second (clash vs Burgdorf), so
    // one session covers both chip states.
    await EditPage.createSession(page, [
      '2026-10-10T18:00',
      '2026-12-04T18:00',
    ]);
    const editPage = new EditPage(page);

    const cleanRow = editPage.proposedDateRows.nth(0);
    await expect(cleanRow.locator('.date-chips .chip--clean', {hasText: 'No other games'}))
      .toBeVisible();
    await expect(cleanRow.locator('.date-chips .chip--clean', {hasText: 'Venue empty'}))
      .toBeVisible();

    const clashRow = editPage.proposedDateRows.nth(1);
    await expect(clashRow)
      .toHaveClass(/clash-row/);
    await expect(clashRow.locator('.date-chips .chip--error'))
      .toBeVisible();

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
    // The add-date form and per-date confirm controls are gone once locked.
    await expect(editPage.proposedDateTimeInput)
      .toHaveCount(0);
    await expect(editPage.confirmButton(0))
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

    // A home-team voter casts a Yes on the first date and a No on the second;
    // each radio change posts the form (votes save incrementally).
    const joinPage = new JoinPage(page);
    await joinPage.goto(session.homeHref);
    await joinPage.join('Alice');
    await joinPage.castVote(0, 'Yes');
    await joinPage.castVote(1, 'No');

    await editPage.goto(session.editUrl);
    await expect(editPage.proposedDateRows.nth(0)
      .locator('.vote-dot-count'))
      .toHaveText('1/4 voted');

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
    // One polite status announcement names the deleted date.
    await expect(editPage.clipboardStatus)
      .toContainText('Proposed date deleted');
    // The surviving date keeps Alice's No vote.
    await expect(editPage.proposedDateRows.nth(0)
      .locator('.vote-dot-count'))
      .toHaveText('1/4 voted');
    await expect(editPage.proposedDateRows.nth(0)
      .locator('.vote-dot--no'))
      .toHaveCount(1);

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

    // The scraped match (Ostermundigen vs Thun, 14.01.2027) is shown in the
    // page heading now that the match-summary paragraph is gone.
    await expect(editPage.heading)
      .toContainText('Ostermundigen vs Thun');
    await expect(editPage.heading)
      .toContainText('Jan 14, 2027');

    // No change-match affordance remains: no "change match details" link and
    // no path back into the wizard from the edit page.
    await expect(editPage.changeMatchDetailsLink)
      .toHaveCount(0);
    await expect(page.getByRole('link', {name: 'Find the match on click-tt.ch instead'}))
      .toHaveCount(0);

    await checkA11y();
  });
});
