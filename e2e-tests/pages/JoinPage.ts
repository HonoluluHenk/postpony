import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';

export type VoteType = 'Yes' | 'No' | 'IfNecessary';

const VOTE_LABELS: Record<VoteType, string> = {
  Yes: 'Yes',
  No: 'No',
  IfNecessary: 'if necessary',
};

// The set-all buttons carry an aria-label that names the action ("Set all: Yes"),
// while the visible text stays the short vote label.
const SET_ALL_ARIA_LABELS: Record<VoteType, string> = {
  Yes: 'Set all: Yes',
  No: 'Set all: No',
  IfNecessary: 'Set all: if necessary',
};

export class JoinPage {
  constructor(private readonly page: Page) {
  }

  async goto(href: string): Promise<JoinPage> {
    await this.page.goto(href);
    return this;
  }

  get heading(): Locator {
    return this.page.getByRole('heading', {name: 'Join the Postponement', level: 2});
  }

  get voteHeading(): Locator {
    return this.page.getByRole('heading', {name: 'Vote on Proposed Dates', level: 2});
  }

  get confirmedHeading(): Locator {
    return this.page.getByRole('heading', {name: 'Postponement Confirmed', level: 2});
  }

  get playerNameInput(): Locator {
    return this.page.getByLabel('Or enter your name');
  }

  get continueButton(): Locator {
    return this.page.getByRole('button', {name: 'Continue'});
  }

  get voteForm(): Locator {
    return this.page.getByRole('form', {name: 'Vote on Proposed Dates'});
  }

  get setAllControls(): Locator {
    return this.voteForm.getByRole('group', {name: 'Set all:'});
  }

  get noDatesMessage(): Locator {
    return this.page.getByText('No dates have been proposed yet');
  }

  get voteIntro(): Locator {
    return this.page.getByText('Here you can state your availability for each proposed date');
  }

  get calendarHint(): Locator {
    return this.page.getByText('Hint: download the calendar file (.ics) and import it into your calendar app');
  }

  get exportCalendarLink(): Locator {
    return this.page.getByRole('link', {name: 'Export as calendar (.ics)'});
  }

  get switchPlayerLink(): Locator {
    return this.page.getByRole('link', {name: 'Not you? Vote as someone else'});
  }

  voteRadio(vote: VoteType): Locator {
    return this.page.getByRole('radio', {name: VOTE_LABELS[vote]});
  }

  voteGroup(dateIndex: number): Locator {
    return this.voteForm.locator('.vote-radio-group')
      .nth(dateIndex);
  }

  voteSummarySection(): Locator {
    return this.page.getByRole('region', {name: 'Vote Summary'});
  }

  voteSummaryTable(): Locator {
    return this.voteSummarySection()
      .getByRole('table');
  }

  async identify(name: string): Promise<void> {
    await this.playerNameInput.fill(name);
    await this.continueButton.click();
  }

  async switchLanguage(locale: string): Promise<void> {
    await this.page.locator('#language-select')
      .selectOption(locale);
    // The lang query is stripped by a server redirect, so wait on the settled <html lang>.
    await expect(this.page.locator('html'))
      .toHaveAttribute('lang', locale);
  }

  async join(name: string): Promise<void> {
    await this.identify(name);
    await expect(this.voteHeading)
      .toBeVisible();
  }

  async castVote(dateIndex: number, vote: VoteType): Promise<void> {
    // ponytail: beer.css hides native radio inputs; toggle via label text. The
    // date groups are class-scoped so the "Set all:" button group is skipped.
    // The client debounces a radio change by ~400ms before posting, so the swap
    // lands after Playwright's click wait window: await it here.
    await this.page.waitForLoadState('load');
    const group = this.voteForm.locator('.vote-radio-group')
      .nth(dateIndex);
    // Re-selecting the current choice fires no change event, hence no save.
    if (await group.getByRole('radio', {name: VOTE_LABELS[vote]})
      .isChecked())
    {
      return;
    }
    const saved = this.waitForVoteSave();
    await group.getByText(VOTE_LABELS[vote], {exact: true})
      .click();
    await saved;
  }

  async setAllVotes(vote: VoteType): Promise<void> {
    await this.page.waitForLoadState('load');
    const saved = this.waitForVoteSave();
    await this.setAllControls
      .getByRole('button', {name: SET_ALL_ARIA_LABELS[vote], exact: true})
      .click();
    await saved;
  }

  // The vote form saves with an HTMX swap of #vote-region, so there is no
  // navigation to wait on: wait for the vote POST response, then for htmx to
  // drop its request class, which it only does once the swap is applied.
  private async waitForVoteSave(): Promise<void> {
    const response = this.page.waitForResponse((resp) =>
      resp.request()
        .method() === 'POST' && new URL(resp.url()).pathname.endsWith('/vote'));
    await response;
    await this.page.waitForFunction(() => !document.querySelector('.htmx-request'));
  }
}
