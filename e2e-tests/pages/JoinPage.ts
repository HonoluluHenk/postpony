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

  get exportCalendarLink(): Locator {
    return this.page.getByRole('link', {name: 'Export as calendar (.ics)'});
  }

  voteRadio(vote: VoteType): Locator {
    return this.page.getByRole('radio', {name: VOTE_LABELS[vote]});
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
    // A radio change posts the form immediately (no submit button), so wait for
    // the page's own JS to be wired and block on the confirmation toast.
    await this.page.waitForLoadState('load');
    await this.voteForm.locator('.vote-radio-group')
      .nth(dateIndex)
      .getByText(VOTE_LABELS[vote], {exact: true})
      .click();
    await expect(this.page.getByText('Your votes have been saved!'))
      .toBeVisible();
  }

  async setAllVotes(vote: VoteType): Promise<void> {
    await this.page.waitForLoadState('load');
    await this.setAllControls
      .getByRole('button', {name: SET_ALL_ARIA_LABELS[vote], exact: true})
      .click();
    await expect(this.page.getByText('Your votes have been saved!'))
      .toBeVisible();
  }
}
