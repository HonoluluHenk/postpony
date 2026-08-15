import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';

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

  get playerNameInput(): Locator {
    return this.page.getByLabel('Or enter your name');
  }

  get continueButton(): Locator {
    return this.page.getByRole('button', {name: 'Continue'});
  }

  get voteForm(): Locator {
    return this.page.getByRole('form', {name: 'Vote on Proposed Dates'});
  }

  get submitVotesButton(): Locator {
    return this.page.getByRole('button', {name: 'Submit Votes'});
  }

  get noDatesMessage(): Locator {
    return this.page.getByText('No dates have been proposed yet');
  }

  voteRadio(vote: 'Yes' | 'No' | 'Maybe'): Locator {
    return this.page.getByRole('radio', {name: vote});
  }

  tallyTable(): Locator {
    return this.teamResultsSection()
      .getByRole('table')
      .last();
  }

  teamResultsSection(): Locator {
    return this.page.getByRole('region', {name: "Your Team's Votes"});
  }

  teamResultsTable(): Locator {
    return this.teamResultsSection()
      .getByRole('table')
      .first();
  }

  async identify(name: string): Promise<void> {
    await this.playerNameInput.fill(name);
    await this.continueButton.click();
  }

  async join(name: string): Promise<void> {
    await this.identify(name);
    await expect(this.voteHeading)
      .toBeVisible();
  }

  async castVote(dateIndex: number, vote: 'Yes' | 'No' | 'Maybe'): Promise<void> {
    // ponytail: beer.css hides native radio inputs; toggle via label text
    await this.voteForm.getByRole('group')
      .nth(dateIndex)
      .getByText(vote, {exact: true})
      .click();
  }

  async submitVotes(): Promise<void> {
    await this.submitVotesButton.click();
  }
}
