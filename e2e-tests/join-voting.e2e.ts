import { expect, test } from './fixtures';
import { EditPage, JoinPage } from './pages';

test.describe('Join and Voting', () => {
  test('shows inline validation error when submitting empty join form', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page);

    // Submit empty form with no name selection
    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.continueButton.click();

    // Error should be visible, focusable, and have alert role
    const error = page.getByRole('alert')
      .filter({hasText: 'Please select your name'});
    await expect(error)
      .toBeVisible();

    await checkA11y();
  });

  test('lets a new player join, cast and change a vote', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    // Step 1: identify with a brand-new name.
    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');

    // Step 2: cast a vote. beer.css visually hides the radio input, so we toggle
    // it via its label text (scoped to the form to avoid the summary table headers).
    await joinPage.castVote(0, 'Yes');
    await joinPage.submitVotes();

    await expect(page.getByText('Your votes have been saved!'))
      .toBeVisible();
    await expect(joinPage.voteRadio('Yes'))
      .toBeChecked();

    // Change the vote and resubmit.
    await joinPage.castVote(0, 'No');
    await joinPage.submitVotes();

    await expect(joinPage.voteRadio('No'))
      .toBeChecked();
    await expect(joinPage.voteRadio('Yes'))
      .not
      .toBeChecked();

    await checkA11y();
  });

  test('remembers the player on return visits via localStorage', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Bob');

    // Revisiting the plain join link auto-redirects to the vote step for the stored player.
    await page.goto(session.homeHref);
    await page.waitForURL(/\/vote\?playerId=.+/);
    await expect(joinPage.voteHeading)
      .toBeVisible();

    await checkA11y();
  });

  test('shows a message when no dates are proposed yet', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Carol');

    await expect(joinPage.noDatesMessage)
      .toBeVisible();
    await expect(joinPage.submitVotesButton)
      .toHaveCount(0);

    await checkA11y();
  });

  test('rejects an invalid invitation token', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const response = await page.goto(`/join/${session.id}/home?token=WRONG`);
    expect(response?.status())
      .toBe(403);
    await expect(page.getByRole('heading', {name: 'Error', level: 2}))
      .toBeVisible();
    await expect(page.getByRole('alert'))
      .toContainText('Invalid or missing invitation token');

    await checkA11y();
  });

  test('rejects an invalid team parameter', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const response = await page.goto(`/join/${session.id}/spectator?token=${session.token}`);
    expect(response?.status())
      .toBe(400);
    await expect(page.getByRole('alert'))
      .toContainText('Invalid team');

    await checkA11y();
  });

  test('home team sees all proposed dates; away team only sees votable ones', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00', '2026-03-12T18:30']);

    // Make only the second date votable for away team
    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);
    await editPage.toggleVotableByOpponent(1);

    // Join as away team — should see only 1 date
    const awayJoinPage = new JoinPage(page);
    await awayJoinPage.goto(session.awayHref);
    await awayJoinPage.join('AwayPlayer');
    await expect(awayJoinPage.voteForm.getByRole('group'))
      .toHaveCount(1);

    // Join as home team — should see both dates
    const homeJoinPage = new JoinPage(page);
    await homeJoinPage.goto(session.homeHref);
    await homeJoinPage.join('HomePlayer');
    await expect(homeJoinPage.voteForm.getByRole('group'))
      .toHaveCount(2);

    await checkA11y();
  });

  // ponytail: EditPage.createSession() navigates to /create first, so if page was on
  // the editUrl it will navigate away. Call goto() on editPage before asserting.
  test('vote tally shows only own-team votes', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);
    await editPage.toggleVotableByOpponent(0);

    // Join as home player and vote Yes
    const homeJoinPage = new JoinPage(page);
    await homeJoinPage.goto(session.homeHref);
    await homeJoinPage.join('HomeVoter');
    await homeJoinPage.castVote(0, 'Yes');
    await homeJoinPage.submitVotes();

    // Join as away player — tally should show 0 away votes
    const awayJoinPage = new JoinPage(page);
    await awayJoinPage.goto(session.awayHref);
    await awayJoinPage.join('AwayVoter');

    let tallyTable = awayJoinPage.tallyTable();
    await expect(tallyTable.getByRole('rowgroup')
      .last()
      .getByRole('row')
      .first()
      .getByRole('cell')
      .nth(1))
      .toHaveText('0'); // yes = 0 (no away-team votes yet)

    // Cast away team vote
    await awayJoinPage.castVote(0, 'No');
    await awayJoinPage.submitVotes();

    // Now away team tally should show 1 No (0 Yes, 0 Maybe)
    tallyTable = awayJoinPage.tallyTable();
    await expect(tallyTable.getByRole('rowgroup')
      .last()
      .getByRole('row')
      .first()
      .getByRole('cell')
      .nth(1))
      .toHaveText('0'); // yes
    await expect(tallyTable.getByRole('rowgroup')
      .last()
      .getByRole('row')
      .first()
      .getByRole('cell')
      .nth(2))
      .toHaveText('0'); // maybe
    await expect(tallyTable.getByRole('rowgroup')
      .last()
      .getByRole('row')
      .first()
      .getByRole('cell')
      .nth(3))
      .toHaveText('1'); // no

    await checkA11y();
  });

  test('shows own-team per-player votes by name in the results section', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);
    await editPage.toggleVotableByOpponent(0);

    // Home voter casts a Yes.
    const homeJoinPage = new JoinPage(page);
    await homeJoinPage.goto(session.homeHref);
    await homeJoinPage.join('HomeVoter');
    await homeJoinPage.castVote(0, 'Yes');
    await homeJoinPage.submitVotes();

    // Home results show HomeVoter's name and their vote.
    const homeResults = homeJoinPage.teamResultsSection();
    await expect(homeResults.getByText('HomeVoter'))
      .toBeVisible();
    await expect(homeResults.getByRole('row', {name: /HomeVoter/}))
      .toContainText('Yes');

    // Away voter sees only their own team's names — HomeVoter never appears.
    const awayJoinPage = new JoinPage(page);
    await awayJoinPage.goto(session.awayHref);
    await awayJoinPage.join('AwayVoter');

    const awayResults = awayJoinPage.teamResultsSection();
    await expect(awayResults.getByText('AwayVoter'))
      .toBeVisible();
    await expect(awayResults.getByText('HomeVoter'))
      .toHaveCount(0);

    await checkA11y();
  });

  test('join and vote steps are accessible', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await expect(joinPage.heading)
      .toBeVisible();
    await checkA11y();

    await joinPage.join('Dora');
    await checkA11y();
  });

  test('shows the pre-proposal empty state to an opponent with no votable dates', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const awayJoinPage = await new JoinPage(page)
      .goto(session.awayHref);
    await awayJoinPage.join('Charlie');

    await expect(awayJoinPage.noDatesMessage)
      .toBeVisible();
    await expect(awayJoinPage.submitVotesButton)
      .toHaveCount(0);
    await expect(awayJoinPage.teamResultsSection())
      .toHaveCount(0);

    await checkA11y();
  });

  test('full happy path: propose, both teams vote, confirm, confirmed-info view', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    // Home team: two players join and vote.
    const homeJoinPage = new JoinPage(page);
    await homeJoinPage.goto(session.homeHref);
    await homeJoinPage.join('Alice');
    await homeJoinPage.castVote(0, 'Yes');
    await homeJoinPage.submitVotes();

    // Second same-team voter: the first join set localStorage, which auto-redirects
    // the join page; clear the stored identity so Bob reaches the register form.
    await page.evaluate(
      (sid) => {
        localStorage.removeItem(`postpony-player-${sid}-home`);
      },
      session.id,
    );
    await homeJoinPage.goto(session.homeHref);
    await homeJoinPage.join('Bob');
    await homeJoinPage.castVote(0, 'Yes');
    await homeJoinPage.submitVotes();

    // Edit view: per-player votes by name + "N/M voted" count.
    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);
    await expect(editPage.ownTeamTable())
      .toContainText('Alice');
    await expect(editPage.ownTeamTable())
      .toContainText('Bob');
    await expect(editPage.ownTeamTable().getByText('2/2 voted'))
      .toBeVisible();

    // Propose to the opponent and have them vote.
    await editPage.toggleVotableByOpponent(0);

    const awayJoinPage = new JoinPage(page);
    await awayJoinPage.goto(session.awayHref);
    await awayJoinPage.join('Charlie');
    await awayJoinPage.castVote(0, 'No');
    await awayJoinPage.submitVotes();

    await editPage.goto(session.editUrl);
    await expect(editPage.awayTallySection()
      .getByRole('table')
      .getByRole('row')
      .nth(1)
      .getByRole('cell')
      .nth(3))
      .toHaveText('1'); // no

    // Confirm the date.
    await editPage.confirmDate(0);
    await expect(editPage.status)
      .toContainText('Confirmed');

    // Both team-facing routes now render the pure-info confirmed view.
    const confirmedPage = new JoinPage(page);
    await confirmedPage.goto(session.homeHref);
    await expect(confirmedPage.confirmedHeading)
      .toBeVisible();
    await expect(page.getByText(/Confirmed date:/))
      .toBeVisible();
    await expect(page.getByRole('button', {name: 'Continue'}))
      .toHaveCount(0);

    const awayPlayerId = await page.evaluate(
      (sid) => localStorage.getItem(`postpony-player-${sid}-away`),
      session.id,
    );
    await page.goto(`/join/${session.id}/away/vote?playerId=${awayPlayerId}&token=${session.token}`);
    await expect(confirmedPage.confirmedHeading)
      .toBeVisible();
    await expect(confirmedPage.voteForm)
      .toHaveCount(0);

    await checkA11y();
  });

  test('blocks registration after confirm: join link renders the confirmed view, no register form', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);
    await editPage.toggleVotableByOpponent(0);
    await editPage.confirmDate(0);
    await expect(editPage.status)
      .toContainText('Confirmed');

    const confirmedPage = new JoinPage(page);
    await confirmedPage.goto(session.awayHref);

    await expect(confirmedPage.confirmedHeading)
      .toBeVisible();
    await expect(page.getByRole('button', {name: 'Continue'}))
      .toHaveCount(0);
    await expect(page.getByLabel('Or enter your name'))
      .toHaveCount(0);

    await checkA11y();
  });
});
