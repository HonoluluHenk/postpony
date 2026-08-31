import type { Locator, Page } from '@playwright/test';
import { EditPage } from './EditPage';
import { isoToLocaleTokens } from './locale-tokens';

// Fixed default so session ids/names stay deterministic in tests; the
// date-picker e2e knows the edit page pre-fills this value and the picker
// opens on its month.
const DEFAULT_ORIGINAL_MATCH_DATETIME = '2026-03-05T20:00';

export interface CreateMatchDetails {
  homeTeam?: string;
  guestTeam?: string;
  originalMatchDateTime?: string;
}

export class CreatePage {
  constructor(private readonly page: Page) {
  }

  async goto(): Promise<CreatePage> {
    await this.page.goto('/create');
    return this;
  }

  get heading(): Locator {
    return this.page.getByRole('heading', {name: 'Create a New Postponement'});
  }

  get changeHeading(): Locator {
    return this.page.getByRole('heading', {name: 'Change Match Details', level: 2});
  }

  get homeTeamInput(): Locator {
    return this.page.getByLabel('Home Team', {exact: true});
  }

  get guestTeamInput(): Locator {
    return this.page.getByLabel('Guest Team', {exact: true});
  }

  get originalMatchDateTimeInput(): Locator {
    return this.page.getByLabel('Original Match Date & Time');
  }

  get submitButton(): Locator {
    return this.page.getByRole('button', {name: 'Create Postponement'});
  }

  get changeSubmitButton(): Locator {
    return this.page.getByRole('button', {name: 'Save changes'});
  }

  async create(details: CreateMatchDetails = {}): Promise<EditPage> {
    const lang = await this.page.locator('html')
      .getAttribute('lang');
    await this.homeTeamInput.fill(details.homeTeam ?? 'Home Team');
    await this.guestTeamInput.fill(details.guestTeam ?? 'Guest Team');
    await this.originalMatchDateTimeInput.fill(
      details.originalMatchDateTime ?? isoToLocaleTokens(lang, DEFAULT_ORIGINAL_MATCH_DATETIME),
    );
    await this.submitButton.click();
    await this.page.waitForURL(/\/edit\/.+/);
    return new EditPage(this.page);
  }
}
