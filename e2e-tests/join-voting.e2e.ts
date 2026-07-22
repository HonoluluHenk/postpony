import { expect, test } from './fixtures';
import { EditPage, JoinPage } from './pages';

test.describe('Join and Voting', () => {
  test('lets a new player join, cast and change a vote', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, 'Join Happy Path', ['2026-03-05T20:00']);

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
    const {session} = await EditPage.createSession(page, 'Join Return Visit', ['2026-03-05T20:00']);

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
    const {session} = await EditPage.createSession(page, 'Join No Dates');

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
    const {session} = await EditPage.createSession(page, 'Join Bad Token', ['2026-03-05T20:00']);

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
    const {session} = await EditPage.createSession(page, 'Join Bad Team', ['2026-03-05T20:00']);

    const response = await page.goto(`/join/${session.id}/spectator?token=${session.token}`);
    expect(response?.status())
      .toBe(400);
    await expect(page.getByRole('alert'))
      .toContainText('Invalid team');

    await checkA11y();
  });

  test('home team sees all proposed dates; away team only sees votable ones', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, 'Team Visibility', ['2026-03-05T20:00', '2026-03-12T18:30']);

    // Make only the second date votable for away team
    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);
    await editPage.toggleAwayVotable(1);

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
    const {session} = await EditPage.createSession(page, 'Team Tally', ['2026-03-05T20:00']);

    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);
    await editPage.toggleAwayVotable(0);

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

    let tallySection = awayJoinPage.tallySection();
    await expect(tallySection.getByRole('rowgroup')
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
    tallySection = awayJoinPage.tallySection();
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
    const {session} = await EditPage.createSession(page, 'Join A11y', ['2026-03-05T20:00']);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await expect(joinPage.heading)
      .toBeVisible();
    await checkA11y();

    await joinPage.join('Dora');
    await checkA11y();
  });
});
