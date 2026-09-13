import { expect, test } from './fixtures';
import { EditPage, JoinPage } from './pages';

// Pulls one `vote-<dateId>=<choice>` link out of an exported .ics, proving the
// external contract a calendar client consumes. Unfolds RFC 5545 line folding
// (`\r\n ` continuations) so a link split at a 75-octet boundary still matches.
function extractVoteLink(body: string, choice: 'Yes' | 'IfNecessary' | 'No'): string {
  const unfolded = body.replace(/\r\n /g, '');
  const match = new RegExp(`https:\\/\\/\\S+?vote-[^&=]+=${choice}`).exec(unfolded);
  if (!match) {
    throw new Error(`no ${choice} vote link found in calendar export`);
  }
  return match[0];
}

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

  test('both teams see only the votable dates', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00', '2026-03-12T18:30']);

    // Close the second date: it disappears from every poll, home and away alike.
    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);
    await editPage.toggleVotable(1);

    // Join as away team — should see only the votable date
    const awayJoinPage = new JoinPage(page);
    await awayJoinPage.goto(session.awayHref);
    await awayJoinPage.join('AwayPlayer');
    await expect(awayJoinPage.voteForm.getByRole('group'))
      .toHaveCount(1);

    // Join as home team — the closed date is hidden from them too
    const homeJoinPage = new JoinPage(page);
    await homeJoinPage.goto(session.homeHref);
    await homeJoinPage.join('HomePlayer');
    await expect(homeJoinPage.voteForm.getByRole('group'))
      .toHaveCount(1);

    await checkA11y();
  });

  // ponytail: EditPage.createSession() navigates to the scrape wizard first, so
  // if page was on the editUrl it will navigate away. Call goto() on editPage
  // before asserting.
  test('vote tally shows only own-team votes', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);

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

    let tallyTable = awayJoinPage.voteSummaryTable();
    // The visually-hidden caption keeps the table's accessible name.
    await expect(tallyTable)
      .toBeVisible();
    await expect(awayJoinPage.voteSummarySection()
      .getByRole('table', {name: 'Vote Summary'}))
      .toBeVisible();
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

    // Now away team tally should show 1 No (0 Yes, 0 if necessary)
    tallyTable = awayJoinPage.voteSummaryTable();
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
      .toHaveText('0'); // if necessary
    await expect(tallyTable.getByRole('rowgroup')
      .last()
      .getByRole('row')
      .first()
      .getByRole('cell')
      .nth(3))
      .toHaveText('1'); // no

    await checkA11y();
  });

  test('join and vote steps are accessible', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await expect(joinPage.heading)
      .toBeVisible();
    await checkA11y();
    await expect(page).toHaveScreenshot('join.png', {fullPage: true});

    await joinPage.join('Dora');
    await checkA11y();
  });

  test('shows the pre-proposal empty state to either team when no dates are votable', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    // Close the only date; both teams land on the pre-proposal empty state.
    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);
    await editPage.toggleVotable(0);

    const awayJoinPage = await new JoinPage(page)
      .goto(session.awayHref);
    await awayJoinPage.join('Charlie');

    await expect(awayJoinPage.noDatesMessage)
      .toBeVisible();
    await expect(awayJoinPage.submitVotesButton)
      .toHaveCount(0);
    await expect(awayJoinPage.voteSummarySection())
      .toHaveCount(0);

    const homeJoinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await homeJoinPage.join('Dora');

    await expect(homeJoinPage.noDatesMessage)
      .toBeVisible();
    await expect(homeJoinPage.submitVotesButton)
      .toHaveCount(0);
    await expect(homeJoinPage.voteSummarySection())
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

    // Edit view: per-player votes by name + "N/M voted" count. Two of the
    // five home-team players (3 scraped + Alice + Bob) vote, so the single
    // proposed date reads 2/5 voted.
    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);
    await editPage.openOwnTeamVotes();
    await expect(editPage.ownTeamTable())
      .toContainText('Alice');
    await expect(editPage.ownTeamTable())
      .toContainText('Bob');
    await expect(editPage.ownTeamTable().getByText('2/5 voted'))
      .toBeVisible();

    // The proposed date is votable by both teams out of the box; have the
    // opponent vote on it.
    const awayJoinPage = new JoinPage(page);
    await awayJoinPage.goto(session.awayHref);
    await awayJoinPage.join('Charlie');
    await awayJoinPage.castVote(0, 'No');
    await awayJoinPage.submitVotes();

    await editPage.goto(session.editUrl);
    await editPage.openAwayTally();
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

test.describe('Click-to-vote from the calendar export', () => {
  test('happy path: an IfNecessary link in the personalized .ics casts the vote', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');
    await expect(joinPage.voteHeading)
      .toBeVisible();

    const playerId = await page.evaluate(
      (sid) => localStorage.getItem(`postpony-player-${sid}-home`),
      session.id,
    );
    expect(playerId)
      .not
      .toBeNull();

    // The poll's export link is the personalized download.
    const href = (await joinPage.exportCalendarLink.getAttribute('href')) ?? '';
    expect(new URL(href).searchParams.get('playerId'))
      .toBe(playerId);

    // A real browser download so the Content-Disposition filename is exercised.
    const downloadPromise = page.waitForEvent('download');
    await joinPage.exportCalendarLink.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename())
      .toMatch(/\.ics$/);

    const response = await page.request.get(href);
    expect(response.status())
      .toBe(200);
    expect(response.headers()['content-type'])
      .toContain('text/calendar');
    const disposition = response.headers()['content-disposition'] ?? '';
    expect(disposition)
      .toMatch(/^attachment; filename=".+\.ics"$/);

    const body = await response.text();
    const link = extractVoteLink(body, 'IfNecessary');
    expect(link)
      .toContain(`token=${session.token}`);
    expect(link)
      .toContain(`playerId=${playerId}`);

    // Clicking the embedded link casts that Participant's vote in one step.
    await page.goto(link);
    await expect(joinPage.voteHeading)
      .toBeVisible();
    await expect(page.getByText('Your votes have been saved!'))
      .toBeVisible();
    await expect(joinPage.voteRadio('IfNecessary'))
      .toBeChecked();
    await expect(joinPage.voteRadio('Yes'))
      .not
      .toBeChecked();

    await checkA11y();
  });

  test('error path: a link without playerId routes through who-are-you and still lands the vote', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');

    // Fetching the export without a Player identity yields an unpersonalized file.
    const personalizedHref = (await joinPage.exportCalendarLink.getAttribute('href')) ?? '';
    const unpersonalizedUrl = new URL(personalizedHref);
    unpersonalizedUrl.searchParams.delete('playerId');

    const response = await page.request.get(unpersonalizedUrl.toString());
    expect(response.status())
      .toBe(200);
    const yesLink = extractVoteLink(await response.text(), 'Yes');
    expect(yesLink)
      .not
      .toContain('playerId=');

    // A browser without a stored identity on this team has to identify first.
    await page.evaluate(
      (sid) => {
        localStorage.removeItem(`postpony-player-${sid}-home`);
      },
      session.id,
    );
    await page.goto(yesLink);

    // The pending choice survives: the register step renders, not the poll.
    await expect(joinPage.heading)
      .toBeVisible();
    await expect(joinPage.voteHeading)
      .toHaveCount(0);

    // After registering, the vote lands without re-selecting the choice.
    await joinPage.join('Bob');
    await expect(joinPage.voteHeading)
      .toBeVisible();
    await expect(page.getByText('Your votes have been saved!'))
      .toBeVisible();
    await expect(joinPage.voteRadio('Yes'))
      .toBeChecked();
    await expect(joinPage.voteRadio('No'))
      .not
      .toBeChecked();

    await checkA11y();
  });
});
