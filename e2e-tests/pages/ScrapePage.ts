import type { Locator, Page } from '@playwright/test';
import { StartPage } from './StartPage';

export class ScrapePage {
  constructor(private readonly page: Page) {
  }

  // ponytail: the wizard is entered from the start page's "find your match"
  // action (ticket 02); the direct /create/scrape URL still works.
  async goto(): Promise<ScrapePage> {
    await this.page.goto('/');
    await new StartPage(this.page)
      .scrapeLink
      .click();
    return this;
  }

  get heading(): Locator {
    return this.page.getByRole('heading', {name: 'Choose your league', level: 2});
  }

  get groupsHeading(): Locator {
    return this.page.getByRole('heading', {name: 'Choose your group', level: 2});
  }

  get teamsHeading(): Locator {
    return this.page.getByRole('heading', {name: 'Choose your team', level: 2});
  }

  get matchesHeading(): Locator {
    return this.page.getByRole('heading', {name: 'Choose the match to reschedule', level: 2});
  }

  get backLink(): Locator {
    return this.page.getByRole('link', {name: 'Back'});
  }

  get listItems(): Locator {
    return this.page.getByRole('listitem');
  }

  get matchRows(): Locator {
    return this.page.getByRole('row');
  }

  get actionsColumnHeader(): Locator {
    return this.page.getByRole('columnheader', {name: 'Actions'});
  }

  selectButton(rowFilter: string): Locator {
    return this.matchRow(rowFilter)
      .getByRole('button', {name: 'Select'});
  }

  matchRowButtons(rowFilter: string): Locator {
    return this.matchRow(rowFilter)
      .getByRole('button');
  }

  leagueLink(name: string): Locator {
    return this.page.getByRole('link', {name, exact: true});
  }

  groupLink(name: string): Locator {
    return this.page.getByRole('link', {name, exact: true});
  }

  teamLink(name: string): Locator {
    return this.page.getByRole('link', {name, exact: true});
  }

  matchRow(filter: string): Locator {
    return this.page.getByRole('row')
      .filter({hasText: filter});
  }

  async pickLeague(name: string): Promise<void> {
    await this.leagueLink(name)
      .click();
  }

  async pickGroup(name: string): Promise<void> {
    await this.groupLink(name)
      .click();
  }

  async pickTeam(name: string): Promise<void> {
    await this.teamLink(name)
      .click();
  }

  async clickBack(): Promise<void> {
    await this.backLink.click();
  }
}
