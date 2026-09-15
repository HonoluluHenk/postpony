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
  // toggle/assertion, so rapid veto/acceptable toggles don't race.
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
  // `.action--veto` / `.action--acceptable` hooks scope each toggle).
  vetoToggle(dateIndex: number): Locator {
    return this.dateRows
      .nth(dateIndex)
      .locator('label.action--veto');
  }

  acceptableToggle(dateIndex: number): Locator {
    return this.dateRows
      .nth(dateIndex)
      .locator('label.action--acceptable');
  }

  vetoCheckbox(dateIndex: number): Locator {
    return this.dateRows
      .nth(dateIndex)
      .getByRole('checkbox', {name: 'Veto this date'});
  }

  acceptableCheckbox(dateIndex: number): Locator {
    return this.dateRows
      .nth(dateIndex)
      .getByRole('checkbox', {name: 'Mark this date acceptable'});
  }

  async toggleVeto(dateIndex: number): Promise<void> {
    await this.vetoToggle(dateIndex)
      .click();
    await expect(this.spinner)
      .toBeHidden();
  }

  async toggleAcceptable(dateIndex: number): Promise<void> {
    await this.acceptableToggle(dateIndex)
      .click();
    await expect(this.spinner)
      .toBeHidden();
  }

  teamTally(dateIndex: number): Locator {
    return this.dateRows
      .nth(dateIndex)
      .locator('.team-tally');
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
}
