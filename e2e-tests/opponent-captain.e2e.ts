import { expect, test } from './fixtures';
import { EditPage, OpponentPage } from './pages';

test.describe('Opponent Captain', () => {
  test('manages the own roster, vetoes, and acceptable flags within the scoped view', async ({page, checkA11y}) => {
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
      .toContainText('Thun:');

    // Veto a votable date, then un-veto it.
    await opponentPage.toggleVeto(0);
    await expect(opponentPage.vetoCheckbox(0))
      .toBeChecked();
    await opponentPage.toggleVeto(0);
    await expect(opponentPage.vetoCheckbox(0))
      .not
      .toBeChecked();

    // Mark a date acceptable, then un-mark it.
    await opponentPage.toggleAcceptable(0);
    await expect(opponentPage.acceptableCheckbox(0))
      .toBeChecked();
    await opponentPage.toggleAcceptable(0);
    await expect(opponentPage.acceptableCheckbox(0))
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
});
