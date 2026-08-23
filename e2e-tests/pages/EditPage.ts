import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import type { SessionFixture } from '../test-session';
import { CreatePage } from './CreatePage';
import { isoToLocaleTokens } from './locale-tokens';

export class EditPage {
  constructor(private readonly page: Page) {
  }

  async goto(url?: string): Promise<EditPage> {
    await this.page.goto(url ?? this.page.url());
    return this;
  }

  static async createSession(page: Page, dates?: string[]): Promise<{
    session: SessionFixture;
    editPage: EditPage
  }>
  {
    const createPage = await new CreatePage(page)
      .goto();
    const editPage = await createPage.create();

    for (const [i, dt] of (dates ?? []).entries()) {
      await editPage.addProposedDate(dt);
      await expect(editPage.proposedDateList.getByRole('listitem'))
        .toHaveCount(i + 1);
    }

    const homeHref = await editPage.homeInviteLink.getAttribute('href');
    if (!homeHref) {
      throw new Error('home invitation link was not rendered');
    }

    const awayHref = await editPage.awayInviteLink.getAttribute('href');
    if (!awayHref) {
      throw new Error('away invitation link was not rendered');
    }

    const url = new URL(homeHref);
    const id = url.pathname.split('/')[2] ?? '';
    const token = url.searchParams.get('token') ?? '';
    const editUrl = page.url();

    return {
      session: {id, token, homeHref, awayHref, editUrl},
      editPage,
    };
  }

  get heading(): Locator {
    return this.page.getByRole('heading', {name: 'Editing Postponement', level: 1});
  }

  get status(): Locator {
    return this.page.getByText('Status:');
  }

  get changeMatchDetailsLink(): Locator {
    return this.page.getByRole('link', {name: 'Change match details'});
  }

  get ownerPasswordAlert(): Locator {
    return this.page.getByRole('alert')
      .filter({hasText: 'Your Owner Password is'});
  }

  get ownerPassword(): Promise<string | null> {
    return this.page.getByText('Your Owner Password is')
      .locator('span')
      .textContent();
  }

  get playerItems(): Locator {
    return this.page.locator('#team-management .list li');
  }

  get homePlayerList(): Locator {
    return this.page.getByRole('list', {name: 'Home Team'});
  }

  get awayPlayerList(): Locator {
    return this.page.getByRole('list', {name: 'Away Team'});
  }

  playerItem(name: string): Locator {
    return this.page.getByText(name)
      .first();
  }

  async addPlayer(name: string, team: 'home' | 'away' = 'home'): Promise<void> {
    const form = this.page.locator('form[hx-post*="/players"]')
      .filter({
        has: this.page.locator(`input[name="teamId"][value="${team}"]`),
      });
    await form.getByLabel('New Player Name')
      .fill(name);
    await form.getByRole('button', {name: 'Add Player'})
      .click();
  }

  get proposedDateTimeInput(): Locator {
    return this.page.getByLabel('Proposed Date & Time');
  }

  get addProposedDateButton(): Locator {
    return this.page.getByRole('button', {name: 'Add Proposed Date'});
  }

  get pickerButton(): Locator {
    return this.page.getByRole('button', {name: 'Open calendar'});
  }

  get proposedDateList(): Locator {
    return this.page.getByRole('list', {name: 'Proposed Dates'});
  }

  get homeInviteLink(): Locator {
    return this.page.locator('a[href*="/home?token="]');
  }

  get awayInviteLink(): Locator {
    return this.page.locator('a[href*="/away?token="]');
  }

  homeTallySection(): Locator {
    return this.page.getByRole('region', {name: 'Home Team Votes'});
  }

  awayTallySection(): Locator {
    return this.page.getByRole('region', {name: 'Away Team Votes'});
  }

  ownTeamSection(): Locator {
    return this.page.getByRole('region', {name: 'Your Team Votes'});
  }

  ownTeamTable(): Locator {
    return this.ownTeamSection()
      .getByRole('table');
  }

  homeTallyTable(): Locator {
    return this.homeTallySection()
      .getByRole('table');
  }

  homeCopyButton(): Locator {
    return this.page.locator('li')
      .filter({has: this.homeInviteLink})
      .locator('button.clipboard-btn');
  }

  awayCopyButton(): Locator {
    return this.page.locator('li')
      .filter({has: this.awayInviteLink})
      .locator('button.clipboard-btn');
  }

  votableByOpponentToggle(dateIndex: number): Locator {
    // ponytail: beer.css hides native checkboxes; toggle via label text
    return this.page.getByText('Allow opponent to vote')
      .nth(dateIndex);
  }

  async addProposedDate(dt: string): Promise<void> {
    const lang = await this.page.locator('html')
      .getAttribute('lang');
    await this.proposedDateTimeInput.fill(isoToLocaleTokens(lang, dt));
    await this.addProposedDateButton.click();
  }

  async toggleVotableByOpponent(dateIndex: number): Promise<void> {
    // ponytail: beer.css hides native checkboxes; toggle via label text
    await this.votableByOpponentToggle(dateIndex)
      .click();
  }

  votableCheckbox(dateIndex: number): Locator {
    return this.proposedDateList.getByRole('listitem')
      .nth(dateIndex)
      .locator('input[type="checkbox"]');
  }

  confirmButton(dateIndex: number): Locator {
    return this.proposedDateList.getByRole('listitem')
      .nth(dateIndex)
      .getByRole('button', {name: 'Confirm'});
  }

  deleteButton(dateIndex: number): Locator {
    return this.proposedDateList.getByRole('listitem')
      .nth(dateIndex)
      .getByRole('button', {name: 'Delete'});
  }

  deleteDialog(dateIndex: number): Locator {
    return this.proposedDateList.getByRole('listitem')
      .nth(dateIndex)
      .getByRole('dialog');
  }

  deleteConfirmButton(dateIndex: number): Locator {
    return this.deleteDialog(dateIndex)
      .getByRole('button', {name: 'Delete'});
  }

  deleteCancelButton(dateIndex: number): Locator {
    return this.deleteDialog(dateIndex)
      .getByRole('button', {name: 'Cancel'});
  }

  async deleteProposedDate(dateIndex: number): Promise<void> {
    await this.deleteButton(dateIndex)
      .click();
    await this.deleteConfirmButton(dateIndex)
      .click();
  }

  reopenButton(): Locator {
    return this.page.getByRole('button', {name: 'Reopen'});
  }

  reopenedCountNote(): Locator {
    return this.page.getByText(/Reopened/);
  }

  async confirmDate(dateIndex: number): Promise<void> {
    await this.confirmButton(dateIndex)
      .click();
  }

  async reopen(): Promise<void> {
    await this.reopenButton()
      .click();
  }

  async getInviteLinks(): Promise<{
    homeHref: string;
    awayHref: string
  }>
  {
    const homeHref = await this.homeInviteLink.getAttribute('href');
    const awayHref = await this.awayInviteLink.getAttribute('href');
    return {homeHref: homeHref ?? '', awayHref: awayHref ?? ''};
  }
}
