import { expect, test } from './fixtures';
import { EditPage, JoinPage, OpponentPage } from './pages';

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

    // The availability description and the calendar tip sit between the heading
    // and the vote form, outside the HTMX-swapped region.
    await expect(joinPage.voteIntro)
      .toBeVisible();
    await expect(joinPage.calendarHint)
      .toBeVisible();
    await expect(joinPage.voteIntro)
      .toContainText('Yes means you are available');

    // Step 2: cast a vote — a radio change posts the form directly. beer.css
    // visually hides the radio input, so we toggle it via its label text
    // (scoped to the form to avoid the summary table headers).
    await joinPage.castVote(0, 'Yes');

    await expect(joinPage.voteRadio('Yes'))
      .toBeChecked();

    // A vote save swaps only #vote-region, so the description stays in place.
    await expect(joinPage.voteIntro)
      .toBeVisible();

    // Change the vote; the new radio click submits again.
    await joinPage.castVote(0, 'No');

    await expect(joinPage.voteRadio('No'))
      .toBeChecked();
    await expect(joinPage.voteRadio('Yes'))
      .not
      .toBeChecked();

    await checkA11y();
  });

  test('restores focus to the changed radio after the save swap without scrolling', async ({
                                                                                             page,
                                                                                             checkA11y,
                                                                                           }) => {
    await page.setViewportSize({width: 1024, height: 400});
    const dates = [
      '2026-03-05T20:00',
      '2026-03-06T20:00',
      '2026-03-07T20:00',
      '2026-03-08T20:00',
      '2026-03-09T20:00',
      '2026-03-10T20:00',
    ];
    const {session} = await EditPage.createSession(page, dates);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');

    // The last date sits below the 400px fold, so the browser scrolls to it
    // before the click. Scroll back to the top before the debounced save lands:
    // the preventScroll focus restore must not scroll the radio back into view.
    await page.waitForLoadState('load');
    const group = joinPage.voteGroup(5);
    await group.getByText('No', {exact: true})
      .click();
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });

    await expect(group.getByRole('radio', {name: 'No'}))
      .toBeFocused();
    expect(await page.evaluate(() => window.scrollY))
      .toBe(0);

    await checkA11y();
  });

  test('set-all buttons fill every date, overwrite earlier picks, and save directly', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00', '2026-03-12T18:30']);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');

    // A hand-picked vote is overwritten by set-all in the same click that submits.
    await joinPage.castVote(0, 'Yes');
    await joinPage.setAllVotes('IfNecessary');
    for (const radio of await joinPage.voteRadio('IfNecessary')
      .all())
    {
      await expect(radio)
        .toBeChecked();
    }

    // The reload echoes both saved votes — one per date.
    for (const row of await joinPage.voteSummaryTable()
      .getByRole('rowgroup')
      .last()
      .getByRole('row')
      .all())
    {
      await expect(row.getByRole('cell')
        .nth(2))
        .toHaveText('1'); // if necessary
    }

    // Re-run with No — overwrites the previous vote and submits again.
    await joinPage.setAllVotes('No');
    for (const radio of await joinPage.voteRadio('No')
      .all())
    {
      await expect(radio)
        .toBeChecked();
    }
    for (const row of await joinPage.voteSummaryTable()
      .getByRole('rowgroup')
      .last()
      .getByRole('row')
      .all())
    {
      await expect(row.getByRole('cell')
        .nth(3))
        .toHaveText('1'); // no
    }

    await checkA11y();
  });

  test('announces the set-all buttons by their full accessible name and the save as a status', async ({
                                                                                                        page,
                                                                                                        checkA11y,
                                                                                                      }) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00', '2026-03-12T18:30']);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');

    // Screen readers hear what each set-all button does, not just "Yes".
    for (const name of ['Set all: Yes', 'Set all: If necessary', 'Set all: No']) {
      await expect(joinPage.setAllControls.getByRole('button', {name, exact: true}))
        .toBeVisible();
    }
    // The visible text stays the short vote label.
    await expect(joinPage.setAllControls.getByRole('button', {name: 'Set all: Yes', exact: true}))
      .toHaveText('Yes');

    // The full venue name reaches assistive tech through the weekly group
    // heading (hoisted once per homogeneous group), not a hover title or each
    // date's legend.
    await expect(joinPage.voteForm.getByRole('heading', {name: /Turnhalle orange, UG, Schule Dennigkofen/}))
      .toHaveCount(2);
    // The per-date radio groups keep date-only legends once the chip is hoisted.
    for (const legend of ['Mar 5, 2026', 'Mar 12, 2026']) {
      await expect(joinPage.voteForm.getByRole('group', {name: legend}))
        .toBeVisible();
    }

    // A routine save is announced politely as a status, not as an alert.
    await joinPage.setAllVotes('Yes');
    await expect(page.getByRole('status')
      .filter({hasText: 'Your votes have been saved!'}))
      .toBeVisible();

    await checkA11y();
  });

  test('keyboard focus reveals a date choice\'s tooltip', async ({page}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');

    // beer.css shows .tooltip only on :hover; the vote form revives it on
    // keyboard focus (the .vote-option wrapper uses :focus-within). Beer hides
    // the native radio visually but keeps it focusable, so .focus() works.
    const group = joinPage.voteGroup(0);
    const tooltip = group.locator('.tooltip')
      .first();
    await group.getByRole('radio', {name: 'Yes'})
      .focus();
    await expect(tooltip)
      .toBeVisible();
    // toBeVisible ignores opacity, so assert the beer.css fade-in actually ran
    // (toHaveCSS retries past the transition).
    await expect(tooltip)
      .toHaveCSS('opacity', '1');

    // Moving focus hides the tooltip again.
    await page.keyboard.press('Tab');
    await expect(tooltip)
      .toBeHidden();
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

  test('lets a participant switch to vote as someone else', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Alice');
    await joinPage.castVote(0, 'Yes');

    // Switching drops the device identity and lands on the register step —
    // not a bounce back to Alice's vote page.
    await joinPage.switchPlayerLink.click();
    await expect(joinPage.heading)
      .toBeVisible();

    // A second player registers from the same device and votes differently.
    await joinPage.join('Bob');
    await joinPage.castVote(0, 'IfNecessary');

    // Both participants' votes count in the shared tally.
    const tally = joinPage.voteSummaryTable()
      .getByRole('rowgroup')
      .last()
      .getByRole('row')
      .first();
    await expect(tally.getByRole('cell')
      .nth(1))
      .toHaveText('1'); // Alice's yes
    await expect(tally.getByRole('cell')
      .nth(2))
      .toHaveText('1'); // Bob's if necessary

    // After the vote save the switch control is still offered below the region.
    await expect(joinPage.switchPlayerLink)
      .toBeVisible();

    await checkA11y();
  });

  test('offers no switch control once the session is confirmed', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);
    const opponentPage = new OpponentPage(page);
    await opponentPage.goto(session.opponentCaptainHref);
    await opponentPage.toggleAccepted(0);
    await editPage.goto(session.editUrl);
    await editPage.confirmDate(0);
    // The confirm posts via HTMX; wait until the server has actually locked it.
    await expect(editPage.status)
      .toContainText('Confirmed');

    // The plain join link renders the confirmed view — no register step, no vote.
    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await expect(joinPage.confirmedHeading)
      .toBeVisible();

    await expect(joinPage.switchPlayerLink)
      .toHaveCount(0);

    await checkA11y();
  });

  test('shows a message when no dates are proposed yet', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page);

    const joinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await joinPage.join('Carol');

    await expect(joinPage.noDatesMessage)
      .toBeVisible();
    await expect(joinPage.setAllControls)
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

    const response = await page.goto(`/join/${session.id}/spectator?token=${session.homeToken}`);
    expect(response?.status())
      .toBe(400);
    await expect(page.getByRole('alert'))
      .toContainText('Invalid team');

    await checkA11y();
  });

  test('rejects the other team\'s password on the home path', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const response = await page.goto(`/join/${session.id}/home?token=${session.awayToken}`);
    expect(response?.status())
      .toBe(403);
    await expect(page.getByRole('alert'))
      .toContainText('This link is for the other team');

    await checkA11y();
  });

  test('an away player joins and votes with the away password', async ({page, checkA11y}) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const joinPage = await new JoinPage(page)
      .goto(session.awayHref);
    await joinPage.join('AwayPlayer');
    await joinPage.castVote(0, 'Yes');

    await expect(joinPage.voteRadio('Yes'))
      .toBeChecked();

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
    // One votable date = exactly one radio trio (Yes / if necessary / No).
    await expect(awayJoinPage.voteForm.getByRole('radio'))
      .toHaveCount(3);

    // Join as home team — the closed date is hidden from them too
    const homeJoinPage = new JoinPage(page);
    await homeJoinPage.goto(session.homeHref);
    await homeJoinPage.join('HomePlayer');
    await expect(homeJoinPage.voteForm.getByRole('radio'))
      .toHaveCount(3);

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
    await expect(page)
      .toHaveScreenshot('join.png', {fullPage: true});

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
    await expect(awayJoinPage.voteSummarySection())
      .toHaveCount(0);

    const homeJoinPage = await new JoinPage(page)
      .goto(session.homeHref);
    await homeJoinPage.join('Dora');

    await expect(homeJoinPage.noDatesMessage)
      .toBeVisible();
    await expect(homeJoinPage.voteSummarySection())
      .toHaveCount(0);

    await checkA11y();
  });

  test('full happy path: propose, both teams vote, confirm, confirmed-info view', async ({page, checkA11y}) => {
    // Scrape + four joins/votes + two navigations + three a11y scans: tripled
    // to survive full-suite parallel contention.
    test.slow();
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    // Home team: two players join and vote.
    const homeJoinPage = new JoinPage(page);
    await homeJoinPage.goto(session.homeHref);
    await homeJoinPage.join('Alice');
    await homeJoinPage.castVote(0, 'Yes');

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

    // Edit view: per-player votes by name + "N/M voted" count via the inline
    // vote dots. Two of the five home-team players (3 scraped + Alice + Bob)
    // vote, so the single proposed date reads 2/5 voted.
    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);
    const firstDateRow = editPage.proposedDateRows.nth(0);
    await expect(firstDateRow.locator('.vote-dot-count'))
      .toHaveText('2/5 voted');
    await expect(firstDateRow.locator('.vote-dot--yes'))
      .toHaveCount(2);

    // The proposed date is votable by both teams out of the box; have the
    // opponent vote on it.
    const awayJoinPage = new JoinPage(page);
    await awayJoinPage.goto(session.awayHref);
    await awayJoinPage.join('Charlie');
    await awayJoinPage.castVote(0, 'No');

    // The opponent captain accepts the date before the organizer
    // confirms it.
    const opponentPage = new OpponentPage(page);
    await opponentPage.goto(session.opponentCaptainHref);
    await opponentPage.toggleAccepted(0);

    // Confirm the date.
    await editPage.goto(session.editUrl);
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
    await page.goto(`/join/${session.id}/away/vote?playerId=${awayPlayerId}&token=${session.awayToken}`);
    await expect(confirmedPage.confirmedHeading)
      .toBeVisible();
    await expect(confirmedPage.voteForm)
      .toHaveCount(0);

    await checkA11y();
  });

  test('blocks registration after confirm: join link renders the confirmed view, no register form', async ({
                                                                                                             page,
                                                                                                             checkA11y,
                                                                                                           }) => {
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);

    const editPage = new EditPage(page);
    await editPage.goto(session.editUrl);

    // The opponent captain accepts the date before the organizer
    // confirms it.
    const opponentPage = new OpponentPage(page);
    await opponentPage.goto(session.opponentCaptainHref);
    await opponentPage.toggleAccepted(0);

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
      .toContain(`token=${session.homeToken}`);
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

  test('error path: a link without playerId routes through who-are-you and still lands the vote', async ({
                                                                                                           page,
                                                                                                           checkA11y,
                                                                                                         }) => {
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

test.describe('Scriptless vote submission', () => {
  test('happy path: a no-JS participant registers, saves a vote, and it persists', async ({
    browser,
    page,
  }) => {
    const {session} = await EditPage.createSession(page, ['2026-06-01T20:00']);

    const context = await browser.newContext({javaScriptEnabled: false});
    const noJsPage = await context.newPage();
    const joinPage = new JoinPage(noJsPage);

    // Registration is a plain form POST, so it works without the runtime.
    await joinPage.goto(session.homeHref);
    await joinPage.identify('Joy');
    await expect(joinPage.voteHeading)
      .toBeVisible();

    // Toggle the first date's choice by label, then submit the raw form.
    await joinPage.voteGroup(0)
      .getByText('Yes', {exact: true})
      .click();
    await joinPage.voteForm.getByRole('button', {name: 'Save votes'})
      .click();
    await expect(noJsPage.getByRole('status')
      .filter({hasText: 'Your votes have been saved!'}))
      .toBeVisible();

    // The choice is stored: still checked after a plain reload.
    await noJsPage.reload();
    await expect(joinPage.voteGroup(0)
      .getByRole('radio', {name: 'Yes'}))
      .toBeChecked();

    await context.close();
  });

  test('likely error path: submitting as an unknown player routes back to identify', async ({
    browser,
    page,
  }) => {
    const {session} = await EditPage.createSession(page, ['2026-06-01T20:00']);

    const context = await browser.newContext({javaScriptEnabled: false});
    const noJsPage = await context.newPage();
    const joinPage = new JoinPage(noJsPage);
    await joinPage.goto(session.homeHref);
    await joinPage.identify('Joy');

    // A stale vote link (valid session+token, unknown player) must not lose the
    // participant: the server sends the register step instead of an error page.
    const voteUrl = new URL(noJsPage.url());
    voteUrl.searchParams.set('playerId', 'no-such-player');
    await noJsPage.goto(voteUrl.toString());

    await expect(joinPage.heading)
      .toBeVisible();
    await expect(joinPage.voteHeading)
      .toHaveCount(0);

    await context.close();
  });
});
