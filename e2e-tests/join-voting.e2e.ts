import { expect, test } from './fixtures';
import { castVote, createSession, getVoteForm, joinAsPlayer, toggleAwayVotable } from './test-helpers';

test.describe('Join and Voting', () => {
  test('lets a new player join, cast and change a vote', async ({page, checkA11y}) => {
    const {homeHref} = await createSession(page, 'Join Happy Path', ['2026-03-05T20:00']);

    // Step 1: identify with a brand-new name.
    await joinAsPlayer(page, homeHref, 'Alice');

    // Step 2: cast a vote. beer.css visually hides the radio input, so we toggle
    // it via its label text (scoped to the form to avoid the summary table headers).
    const voteForm = getVoteForm(page);
    await castVote(voteForm, 0, 'Yes');
    await page.getByRole('button', {name: 'Submit Votes'})
      .click();

    await expect(page.getByText('Your votes have been saved!'))
      .toBeVisible();
    await expect(page.getByRole('radio', {name: 'Yes'}))
      .toBeChecked();

    // Change the vote and resubmit.
    await castVote(voteForm, 0, 'No');
    await page.getByRole('button', {name: 'Submit Votes'})
      .click();

    await expect(page.getByRole('radio', {name: 'No'}))
      .toBeChecked();
    await expect(page.getByRole('radio', {name: 'Yes'}))
      .not
      .toBeChecked();

    await checkA11y();
  });

  test('remembers the player on return visits via localStorage', async ({page, checkA11y}) => {
    const {homeHref} = await createSession(page, 'Join Return Visit', ['2026-03-05T20:00']);

    await joinAsPlayer(page, homeHref, 'Bob');

    // Revisiting the plain join link auto-redirects to the vote step for the stored player.
    await page.goto(homeHref);
    await page.waitForURL(/\/vote\?playerId=.+/);
    await expect(page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2}))
      .toBeVisible();

    await checkA11y();
  });

  test('shows a message when no dates are proposed yet', async ({page, checkA11y}) => {
    const {homeHref} = await createSession(page, 'Join No Dates');

    await joinAsPlayer(page, homeHref, 'Carol');

    await expect(page.getByText('No dates have been proposed yet'))
      .toBeVisible();
    await expect(page.getByRole('button', {name: 'Submit Votes'}))
      .toHaveCount(0);

    await checkA11y();
  });

  test('rejects an invalid invitation token', async ({page, checkA11y}) => {
    const {id} = await createSession(page, 'Join Bad Token', ['2026-03-05T20:00']);

    const response = await page.goto(`/join/${id}/home?token=WRONG`);
    expect(response?.status())
      .toBe(403);
    await expect(page.getByRole('heading', {name: 'Error', level: 2}))
      .toBeVisible();
    await expect(page.getByRole('alert'))
      .toContainText('Invalid or missing invitation token');

    await checkA11y();
  });

  test('rejects an invalid team parameter', async ({page, checkA11y}) => {
    const {id, token} = await createSession(page, 'Join Bad Team', ['2026-03-05T20:00']);

    const response = await page.goto(`/join/${id}/spectator?token=${token}`);
    expect(response?.status())
      .toBe(400);
    await expect(page.getByRole('alert'))
      .toContainText('Invalid team');

    await checkA11y();
  });

  test('home team sees all proposed dates; away team only sees votable ones', async ({page, checkA11y}) => {
    const session = await createSession(page, 'Team Visibility', ['2026-03-05T20:00', '2026-03-12T18:30']);

    // ponytail: beer.css hides native checkboxes; toggle via label text
    await page.goto(session.editUrl);
    await toggleAwayVotable(page, 1);

    // Join as away team — should see only 1 date
    await joinAsPlayer(page, session.awayHref, 'AwayPlayer');
    await expect(getVoteForm(page)
      .getByRole('group'))
      .toHaveCount(1);

    // Join as home team — should see both dates
    await joinAsPlayer(page, session.homeHref, 'HomePlayer');
    await expect(getVoteForm(page)
      .getByRole('group'))
      .toHaveCount(2);

    await checkA11y();
  });

  test('vote tally shows only own-team votes', async ({page, checkA11y}) => {
    const session = await createSession(page, 'Team Tally', ['2026-03-05T20:00']);

    await page.goto(session.editUrl);
    await toggleAwayVotable(page, 0);

    // Join as home player and vote Yes
    await joinAsPlayer(page, session.homeHref, 'HomeVoter');
    await castVote(getVoteForm(page), 0, 'Yes');
    await page.getByRole('button', {name: 'Submit Votes'})
      .click();

    // Join as away player — tally should show 0 away votes
    await joinAsPlayer(page, session.awayHref, 'AwayVoter');

    let tallySection = page.getByRole('region', {name: 'Vote Summary'});
    await expect(tallySection.getByRole('rowgroup')
      .last()
      .getByRole('row')
      .first()
      .getByRole('cell')
      .nth(1))
      .toHaveText('0'); // yes = 0 (no away-team votes yet)

    // Cast away team vote
    await castVote(getVoteForm(page), 0, 'No');
    await page.getByRole('button', {name: 'Submit Votes'})
      .click();

    // Now away team tally should show 1 No (0 Yes, 0 Maybe)
    tallySection = page.getByRole('region', {name: 'Vote Summary'});
    await expect(tallySection.getByRole('rowgroup')
      .last()
      .getByRole('row')
      .first()
      .getByRole('cell')
      .nth(1))
      .toHaveText('0'); // yes
    await expect(tallySection.getByRole('rowgroup')
      .last()
      .getByRole('row')
      .first()
      .getByRole('cell')
      .nth(2))
      .toHaveText('0'); // maybe
    await expect(tallySection.getByRole('rowgroup')
      .last()
      .getByRole('row')
      .first()
      .getByRole('cell')
      .nth(3))
      .toHaveText('1'); // no

    await checkA11y();
  });

  test('join and vote steps are accessible', async ({page, checkA11y}) => {
    const {homeHref} = await createSession(page, 'Join A11y', ['2026-03-05T20:00']);

    await page.goto(homeHref);
    await expect(page.getByRole('heading', {name: 'Join the Postponement', level: 2}))
      .toBeVisible();
    await checkA11y();

    await joinAsPlayer(page, homeHref, 'Dora');
    await checkA11y();
  });
});
