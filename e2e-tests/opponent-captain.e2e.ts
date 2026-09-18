import { expect, test } from './fixtures';
import { EditPage, JoinPage, OpponentPage } from './pages';
import type { VoteType } from './pages/JoinPage';

test.describe('Opponent Captain', () => {
  test('manages the own roster, votable and accepted flags within the scoped view', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const opponentPage = await new OpponentPage(page)
      .goto(session.opponentCaptainHref);

    // The headline names the opponent side (Thun), never the organizer side.
    await expect(opponentPage.heading)
      .toContainText('Thun');
    await expect(page.getByText('Ostermundigen', {exact: false}))
      .toHaveCount(0);

    // Roster: add a player to the opponent team, then remove them.
    await opponentPage.addPlayer('Opponent Alice');
    await expect(opponentPage.playerItem('Opponent Alice'))
      .toBeVisible();

    await opponentPage.removePlayer('Opponent Alice');
    await expect(opponentPage.playerItem('Opponent Alice'))
      .toHaveCount(0);

    // Only the opponent team's tally is shown.
    await expect(opponentPage.teamTally(0))
      .toContainText('Votes team Thun:');

    // Turn the opponent team's Votable off, then back on.
    await opponentPage.toggleOpponentVotable(0);
    await expect(opponentPage.opponentVotableCheckbox(0))
      .not
      .toBeChecked();
    await opponentPage.toggleOpponentVotable(0);
    await expect(opponentPage.opponentVotableCheckbox(0))
      .toBeChecked();

    // Mark a date accepted, then un-mark it.
    await opponentPage.toggleAccepted(0);
    await expect(opponentPage.acceptedCheckbox(0))
      .toBeChecked();
    await opponentPage.toggleAccepted(0);
    await expect(opponentPage.acceptedCheckbox(0))
      .not
      .toBeChecked();

    // No organizer affordances: propose, votable toggle, or confirm.
    await expect(page.getByRole('button', {name: 'Add Proposed Date'}))
      .toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Confirm Date'}))
      .toHaveCount(0);
    await expect(page.getByText('Allow voting'))
      .toHaveCount(0);

    await checkA11y();
  });

  test('shows the workflow instructions and remembers their collapsed state across reloads', async ({page}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);
    const opponentPage = await new OpponentPage(page)
      .goto(session.opponentCaptainHref);

    // The instructions render open with the four opponent-captain steps.
    const instructions = opponentPage.workflowInstructions;
    await expect(instructions)
      .toHaveAttribute('open', '');
    await expect(instructions.locator('summary'))
      .toHaveText('How it works');
    await expect(instructions.locator('li'))
      .toHaveCount(4);
    // The availability-sort explanation rides along in the block.
    await expect(instructions)
      .toContainText('Tip: sorting by availability');

    // Collapse; the closed state survives a reload.
    await instructions.locator('summary')
      .click();
    await expect(instructions)
      .not
      .toHaveAttribute('open');
    await page.reload();
    await expect(opponentPage.workflowInstructions)
      .not
      .toHaveAttribute('open');
  });

  test('sorts the proposed dates by availability and keeps the sort across a mutation', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, [
      '2026-03-05T20:00',
      '2026-03-12T20:00',
      '2026-03-19T20:00',
    ]);

    // Two opponent-side players vote so the default format (2–3 players) has
    // playable dates: the first two reach two available, the third none.
    const joinPage = new JoinPage(page);
    const voteAs = async (name: string, votes: VoteType[]): Promise<void> => {
      await page.evaluate(
        (sid) => {
          localStorage.removeItem(`postpony-player-${sid}-away`);
        },
        session.id,
      );
      await joinPage.goto(session.awayHref);
      await joinPage.join(name);
      for (const [i, vote] of votes.entries()) {
        await joinPage.castVote(i, vote);
      }
    };
    await voteAs('Alice', ['Yes', 'Yes', 'No']);
    await voteAs('Bob', ['Yes', 'IfNecessary', 'No']);

    const opponentPage = await new OpponentPage(page)
      .goto(session.opponentCaptainHref);

    // Default Date sort: one ISO-week group per date.
    await expect(opponentPage.sortRadio('Date'))
      .toBeChecked();
    await expect(opponentPage.groupHeads)
      .toHaveCount(3);

    // Availability sort: two available dates rank reduced strength, the
    // unplayable one follows; dates stay ascending within each band.
    await opponentPage.sortBy('Availability');
    await expect(opponentPage.sortRadio('Availability'))
      .toBeChecked();
    await expect(page)
      .toHaveURL(/sort=availability/);
    await expect(opponentPage.groupHeads)
      .toHaveCount(2);
    await expect(opponentPage.groupHeads.nth(0))
      .toHaveAccessibleName('Reduced strength (2)');
    await expect(opponentPage.groupHeads.nth(1))
      .toHaveAccessibleName('Not playable (1)');

    // A mutation (accepted toggle) recovers the sort from the current URL.
    await opponentPage.toggleAccepted(0);
    await expect(opponentPage.sortRadio('Availability'))
      .toBeChecked();
    await expect(page)
      .toHaveURL(/sort=availability/);
    await expect(opponentPage.groupHeads)
      .toHaveCount(2);
    await expect(opponentPage.groupHeads.nth(0))
      .toHaveAccessibleName('Reduced strength (2)');
    await expect(opponentPage.groupHeads.nth(1))
      .toHaveAccessibleName('Not playable (1)');

    // Switching back restores the ISO-week grouping; a reload keeps the sort.
    await opponentPage.sortBy('Date');
    await expect(opponentPage.groupHeads)
      .toHaveCount(3);
    await expect(page)
      .toHaveURL(/\/opponent\/[^?]+\?opponentCaptainPassword=[^&]+&sort=date$/);
    await page.reload();
    await expect(opponentPage.sortRadio('Date'))
      .toBeChecked();

    await checkA11y();
  });

  test('takes a date out of the opponent team\'s vote view and restores it', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    // The opponent player joins and sees the date in their vote view.
    const joinPage = new JoinPage(page);
    await joinPage.goto(session.awayHref);
    await joinPage.join('Opponent Charlie');
    await expect(joinPage.voteGroup(0))
      .toBeVisible();

    const playerId = await page.evaluate(
      (sid) => localStorage.getItem(`postpony-player-${sid}-away`),
      session.id,
    );
    const voteUrl = `/join/${session.id}/away/vote?playerId=${playerId}&token=${session.awayToken}`;

    // The captain takes the date out of their own team's poll.
    const opponentPage = await new OpponentPage(page)
      .goto(session.opponentCaptainHref);
    await opponentPage.toggleOpponentVotable(0);

    // The opponent player's vote view hides the date.
    await page.goto(voteUrl);
    await expect(joinPage.voteGroup(0))
      .toHaveCount(0);
    await expect(joinPage.noDatesMessage)
      .toBeVisible();

    // Turning it back on restores the date.
    await opponentPage.goto(session.opponentCaptainHref);
    await opponentPage.toggleOpponentVotable(0);
    await page.goto(voteUrl);
    await expect(joinPage.voteGroup(0))
      .toBeVisible();

    await checkA11y();
  });

  test('shows the own clash lines and clean chip while hiding organizer-side info', async ({page, checkA11y}) => {
    // Scrape-created session (fixture mode): organizer claims the home side
    // (Ostermundigen), the opponent captain sits on the away side (Thun).
    const {session, editPage} = await EditPage.createSession(page);

    // Organizer-only clash: Ostermundigen hosts Port on 07.09.2026 00:00, Thun
    // is free that night. Both-sides clash: Ostermundigen hosts Heimberg and
    // Aarberg hosts Thun, both on 26.10.2026 00:00. Opponent-only clash:
    // Burgdorf hosts Thun on 04.12.2026 19:30. Clean: nothing on 10.10.2026.
    const dates = [
      '2026-09-07T01:00',
      '2026-10-10T18:00',
      '2026-10-26T01:00',
      '2026-12-04T18:00',
    ];
    for (const [i, dt] of dates.entries()) {
      await editPage.addProposedDate(dt);
      await expect(editPage.proposedDateRows)
        .toHaveCount(i + 1);
    }

    // Clashing dates arrive auto-deselected; re-enable them so they reach the
    // opponent poll. Chronological rows: 07.09 (0), 10.10 (1), 26.10 (2), 04.12 (3).
    // Each toggle waits for its server-rendered hx-post to flip to votable=false
    // (the native checkbox flips instantly, before the round-trip settles) so
    // concurrent full-session saves cannot clobber each other last-write-wins
    // style.
    for (const index of [0, 2, 3]) {
      await editPage.toggleVotable(index);
      await expect(editPage.votableCheckbox(index))
        .toHaveAttribute('hx-post', /votable=false/);
    }

    // The edit page shows both sides: the both-sides date carries a Home and
    // an Away line, the organizer-only date its Home line.
    await expect(editPage.proposedDateList.getByText('Home: 12:00 AM vs Heimberg'))
      .toBeVisible();
    await expect(editPage.proposedDateList.getByText('Away: 12:00 AM vs Aarberg'))
      .toBeVisible();
    await expect(editPage.proposedDateList.getByText('Home: 12:00 AM vs Port'))
      .toBeVisible();
    await expect(editPage.proposedDateList.getByText('Away: 7:30 PM vs Burgdorf'))
      .toBeVisible();

    const opponentPage = await new OpponentPage(page)
      .goto(session.opponentCaptainHref);
    await expect(opponentPage.dateRows)
      .toHaveCount(4);

    // Four-part date cell on the opponent row.
    await expect(opponentPage.dateCell(3)
      .locator('.date-day'))
      .toContainText('Fr');
    await expect(opponentPage.dateCell(3)
      .locator('.date-num'))
      .toContainText('December 4');
    await expect(opponentPage.dateCell(3)
      .locator('.date-time'))
      .toContainText('6:00 PM');
    await expect(opponentPage.dateCell(3)
      .locator('.date-year'))
      .toContainText('2026');

    // Opponent-only clash: the neutral line without a home/away prefix.
    await expect(opponentPage.clashChips(3))
      .toContainText('7:30 PM vs Burgdorf');
    await expect(page.getByText('Away: 7:30 PM vs Burgdorf'))
      .toHaveCount(0);

    // Clean date: the clean chip.
    await expect(opponentPage.dateChips(1))
      .toContainText('No other games');

    // Both-sides date: exactly the opponent side's line.
    await expect(opponentPage.clashChips(2))
      .toHaveCount(1);
    await expect(opponentPage.clashChips(2))
      .toContainText('12:00 AM vs Aarberg');
    await expect(page.getByText('vs Heimberg'))
      .toHaveCount(0);

    // Organizer-only date: the opponent side is checked-clean, so it shows
    // the clean chip — and none of the organizer side's clash info.
    await expect(opponentPage.dateChips(0))
      .toContainText('No other games');
    await expect(page.getByText('vs Port'))
      .toHaveCount(0);

    // No organizer-side info anywhere: no team name, no side prefixes.
    await expect(page.getByText('Ostermundigen', {exact: false}))
      .toHaveCount(0);
    await expect(page.getByText('Home:', {exact: false}))
      .toHaveCount(0);
    await expect(page.getByText('Away:', {exact: false}))
      .toHaveCount(0);

    // Screen-reader groups: two clash groups, two clean groups.
    await expect(page.getByRole('group', {name: 'Schedule clash'}))
      .toHaveCount(2);
    await expect(page.getByRole('group', {name: 'No other games'}))
      .toHaveCount(2);

    await checkA11y();
  });

  test('refreshes the own clash snapshot without touching the organizer side', async ({page, checkA11y}) => {
    // Scrape-created session (fixture mode): organizer claims the home side
    // (Ostermundigen), the opponent captain sits on the away side (Thun).
    const {session, editPage} = await EditPage.createSession(page);

    // Organizer-only clash (07.09), clean (10.10), both-sides (26.10),
    // opponent-only (04.12) — the same verified candidate dates as above.
    const dates = [
      '2026-09-07T01:00',
      '2026-10-10T18:00',
      '2026-10-26T01:00',
      '2026-12-04T18:00',
    ];
    for (const [i, dt] of dates.entries()) {
      await editPage.addProposedDate(dt);
      await expect(editPage.proposedDateRows)
        .toHaveCount(i + 1);
    }

    // Clashing dates arrive auto-deselected; re-enable them so they reach the
    // opponent poll, waiting for each server-rendered hx-post to flip.
    for (const index of [0, 2, 3]) {
      await editPage.toggleVotable(index);
      await expect(editPage.votableCheckbox(index))
        .toHaveAttribute('hx-post', /votable=false/);
    }

    const opponentPage = await new OpponentPage(page)
      .goto(session.opponentCaptainHref);
    await expect(opponentPage.dateRows)
      .toHaveCount(4);

    // The re-check button is offered because the opponent side has a team identity.
    await expect(opponentPage.refreshButton)
      .toBeVisible();
    await opponentPage.refreshClashes();

    // Success surfaces the reused refreshed announcement (a visually-hidden
    // live region: assert by id and text rather than by role/visibility).
    await expect(opponentPage.announcement)
      .toContainText('Schedule check refreshed');
    // The refreshed snapshot keeps the scoping: the both-sides date shows
    // exactly the opponent side's line, the clean date its clean chip, and no
    // failure notice renders.
    await expect(opponentPage.clashChips(2))
      .toHaveCount(1);
    await expect(opponentPage.clashChips(2))
      .toContainText('12:00 AM vs Aarberg');
    await expect(opponentPage.dateChips(1))
      .toContainText('No other games');
    await expect(opponentPage.clashChips(3))
      .toContainText('7:30 PM vs Burgdorf');
    await expect(page.getByText('showing the previous results'))
      .toHaveCount(0);

    // The organizer side's snapshot survived the opponent refresh
    // byte-identical: the edit page still shows both lines, and the symmetric
    // votable switch never flipped.
    await editPage.goto(session.editUrl);
    await expect(editPage.proposedDateList.getByText('Home: 12:00 AM vs Heimberg'))
      .toBeVisible();
    await expect(editPage.proposedDateList.getByText('Away: 12:00 AM vs Aarberg'))
      .toBeVisible();
    for (const index of [0, 2, 3]) {
      await expect(editPage.votableCheckbox(index))
        .toBeChecked();
    }

    await checkA11y();
  });
});
