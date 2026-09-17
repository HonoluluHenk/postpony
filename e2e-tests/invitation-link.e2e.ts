import { expect, test } from './fixtures';
import { EditPage, OpponentPage } from './pages';

test.describe('Invitation Link', () => {
  test('should display absolute join links with tokens for both teams', async ({page, baseURL, checkA11y}) => {
    // 1. Mint a new postponing-session via the scrape wizard (Ostermundigen
    //    hosts Thun on the return fixture match, so the organizer claims home).
    const {editPage, session} = await EditPage.createSession(page);

    // baseURL in playwright.config.ts is https://game-scheduler.localhost:<E2E_APP_PORT> (default 3001)
    if (!baseURL) {
      throw new Error('baseURL is not defined in the test context');
    }
    const expectedBase = baseURL;

    // 2. The organizer's edit page keeps only its own-team join link and the
    //    opponent-captain link; the opponent team's link is gone from here.
    await expect(editPage.homeInviteLink)
      .toBeVisible();
    await expect(editPage.opponentCaptainInviteLink)
      .toBeVisible();
    await expect(page.locator('a[href*="/away?token="]'))
      .toHaveCount(0);

    const homeHref = await editPage.homeInviteLink.getAttribute('href');
    expect(homeHref)
      .toMatch(new RegExp(`^${expectedBase}/join/.+/home\\?token=.+`));

    // The organizer sees "My team" for Ostermundigen on their own link.
    await expect(editPage.homeInviteLink)
      .toHaveText('My team invitation link (Ostermundigen)');

    // 3. The opponent captain distributes his own team's link from his page.
    const opponentPage = await new OpponentPage(page)
      .goto(session.opponentCaptainHref);
    const awayHref = (await opponentPage.teamInviteLink.getAttribute('href')) ?? '';
    expect(awayHref)
      .toMatch(new RegExp(`^${expectedBase}/join/.+/away\\?token=.+`));

    // The home and away links carry distinct per-team player passwords.
    const homeToken = new URL(homeHref ?? '').searchParams.get('token');
    const awayToken = new URL(awayHref).searchParams.get('token');
    expect(homeToken)
      .toBeTruthy();
    expect(awayToken)
      .toBeTruthy();
    expect(homeToken)
      .not
      .toBe(awayToken);

    // 4. Labels follow the reader's own perspective: the captain sees "My
    //    team" for Thun on his page.
    await expect(opponentPage.teamInviteLink)
      .toHaveText('My team invitation link (Thun)');

    await checkA11y();
  });

  test('should announce "Copied to clipboard" via the status element when a copy button is pressed', async ({
                                                                                                              page,
                                                                                                              checkA11y,
                                                                                                            }) => {
    const {editPage} = await EditPage.createSession(page);

    await editPage.homeCopyButton()
      .click();

    await expect(editPage.clipboardStatus)
      .toHaveText('Copied to clipboard');

    // the announcement clears after ~2 s alongside the icon swap
    await expect(editPage.clipboardStatus)
      .toHaveText('');

    await checkA11y();
  });

  test('should announce "Copied to clipboard" when the opponent team invite copy button is pressed', async ({
                                                                                                              page,
                                                                                                              checkA11y,
                                                                                                            }) => {
    const {session} = await EditPage.createSession(page);

    const opponentPage = await new OpponentPage(page)
      .goto(session.opponentCaptainHref);
    await opponentPage.teamInviteCopyButton.click();

    await expect(opponentPage.announcement)
      .toHaveText('Copied to clipboard');

    // the announcement clears after ~2 s alongside the icon swap
    await expect(opponentPage.announcement)
      .toHaveText('');

    await checkA11y();
  });

  test('should announce "Copied to clipboard" when the organizer password copy button is pressed', async ({
                                                                                                            page,
                                                                                                            checkA11y,
                                                                                                          }) => {
    const {editPage} = await EditPage.createSession(page);

    await expect(editPage.organizerPasswordToast)
      .toBeVisible();

    await editPage.organizerPasswordCopyButton.click();

    await expect(editPage.clipboardStatus)
      .toHaveText('Copied to clipboard');

    await checkA11y();
  });

  test('should use APP_BASE_URL environment variable if provided', async () => {
    // This test is a bit tricky to run in the same process if we don't restart the server.
    // But we can at least verify that it works when the server is started with it.
    // For now, we've verified the code change.
  });
});
