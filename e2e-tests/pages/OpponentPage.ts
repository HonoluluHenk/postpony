import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';

export class OpponentPage {
  constructor(private readonly page: Page) {
  }

  async goto(href: string): Promise<OpponentPage> {
    await this.page.goto(href);
    return this;
  }

  // The global HTMX spinner shows while a toggle's round-trip is in flight;
  // waiting for it to hide guarantees the re-render has settled before the next
  // toggle/assertion, so rapid votable/accepted toggles don't race.
  get spinner(): Locator {
    return this.page.locator('#global-spinner');
  }

  // The layout h1 shows the opponent team name as the headline.
  get heading(): Locator {
    return this.page.getByRole('heading', {level: 1});
  }

  get roster(): Locator {
    return this.page.getByRole('list', {name: 'Your Team Roster'});
  }

  // The invite block lives inside the roster section; the link is the away/home
  // join URL with the player token, scoped to the opponent side.
  get teamInviteLink(): Locator {
    return this.page.locator('#opponent-roster a[href*="/join/"]');
  }

  get teamInviteCopyButton(): Locator {
    return this.page.locator('#opponent-roster button.copy-btn');
  }

  get playerItems(): Locator {
    return this.roster.locator('li');
  }

  playerItem(name: string): Locator {
    return this.playerItems.filter({hasText: name});
  }

  get playerNameInput(): Locator {
    return this.page.getByLabel('New Player Name');
  }

  async addPlayer(name: string): Promise<void> {
    await this.playerNameInput.fill(name);
    await this.page.getByRole('button', {name: 'Add Player'})
      .click();
  }

  async removePlayer(name: string): Promise<void> {
    await this.playerItem(name)
      .getByRole('button', {name: `Remove ${name}`})
      .click();
  }

  get dateRows(): Locator {
    return this.page.locator('#opponent-dates .date-row');
  }

  // beer.css hides the native checkbox; toggle via the visible label (the
  // `.action--opponent-votable` / `.action--accepted` hooks scope each toggle).
  // The accessible names carry the row's date, so match them by their prefix.
  opponentVotableToggle(dateIndex: number): Locator {
    return this.dateRows
      .nth(dateIndex)
      .locator('label.action--opponent-votable');
  }

  acceptedToggle(dateIndex: number): Locator {
    return this.dateRows
      .nth(dateIndex)
      .locator('label.action--accepted');
  }

  opponentVotableCheckbox(dateIndex: number): Locator {
    return this.dateRows
      .nth(dateIndex)
      .getByRole('checkbox', {name: /Your team may vote on/});
  }

  acceptedCheckbox(dateIndex: number): Locator {
    return this.dateRows
      .nth(dateIndex)
      .getByRole('checkbox', {name: /Accept .+ — the organizer may confirm it/});
  }

  async toggleOpponentVotable(dateIndex: number): Promise<void> {
    await this.opponentVotableToggle(dateIndex)
      .click();
    await expect(this.spinner)
      .toBeHidden();
  }

  async toggleAccepted(dateIndex: number): Promise<void> {
    await this.acceptedToggle(dateIndex)
      .click();
    await expect(this.spinner)
      .toBeHidden();
  }

  teamTally(dateIndex: number): Locator {
    return this.dateRows
      .nth(dateIndex)
      .locator('.team-tally');
  }

  get sortControl(): Locator {
    return this.page.getByRole('radiogroup', {name: 'Sort by'});
  }

  sortRadio(name: 'Date' | 'Availability'): Locator {
    return this.sortControl.getByRole('radio', {name});
  }

  async sortBy(name: 'Date' | 'Availability'): Promise<void> {
    // beer.css hides native radios; toggle via the visible label text.
    await this.sortControl.getByText(name, {exact: true})
      .click();
    await expect(this.spinner)
      .toBeHidden();
  }

  // Availability bands ("Reduced strength (2)") and ISO-week groups share `.week-head`.
  get groupHeads(): Locator {
    return this.page.locator('#opponent-dates .week-head');
  }

  dateCell(dateIndex: number): Locator {
    return this.dateRows
      .nth(dateIndex)
      .locator('.date-cell');
  }

  dateChips(dateIndex: number): Locator {
    return this.dateRows
      .nth(dateIndex)
      .locator('.date-chips');
  }

  clashChips(dateIndex: number): Locator {
    return this.dateRows
      .nth(dateIndex)
      .locator('.date-chips .chip--error');
  }

  get refreshButton(): Locator {
    return this.page.getByRole('button', {name: 'Refresh Schedule Check'});
  }

  get announcement(): Locator {
    return this.page.locator('#clipboard-status');
  }

  async refreshClashes(): Promise<void> {
    await this.refreshButton.click();
    await expect(this.spinner)
      .toBeHidden();
  }
}
