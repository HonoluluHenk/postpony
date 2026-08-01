import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import type { SessionFixture } from '../test-session';
import { CreatePage } from './CreatePage';

export class EditPage {
  constructor(private readonly page: Page) {
  }

  async goto(url?: string): Promise<EditPage> {
    await this.page.goto(url ?? this.page.url());
    return this;
  }

  static async createSession(page: Page, name?: string, dates?: string[]): Promise<{
    session: SessionFixture;
    editPage: EditPage
  }>
  {
    const createPage = await new CreatePage(page)
      .goto();
    const editPage = await createPage.create(name ?? 'Test Session');

    for (const [i, dt] of (dates ?? []).entries()) {
      await editPage.proposedDateTimeInput.fill(dt);
      await editPage.addProposedDateButton.click();
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

  get ownerPasswordAlert(): Locator {
    return this.page.getByRole('alert')
      .filter({hasText: 'Your Owner Password is'});
  }

  get ownerPassword(): Promise<string | null> {
    return this.page.getByText('Your Owner Password is')
      .locator('span')
      .textContent();
  }

  get maxOverlapsInput(): Locator {
    return this.page.getByLabel('Maximum Overlapping Matches');
  }

  get updateVenueButton(): Locator {
    return this.page.getByRole('button', {name: 'Update Venue Settings'});
  }

  get playerItems(): Locator {
    return this.page.locator('#team-management .list li');
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

  awayVoteToggle(dateIndex: number): Locator {
    // ponytail: beer.css hides native checkboxes; toggle via label text
    return this.page.getByText('Allow away team to vote')
      .nth(dateIndex);
  }

  async updateVenueSettings(maxOverlaps: string): Promise<void> {
    await this.maxOverlapsInput.fill(maxOverlaps);
    await this.updateVenueButton.click();
  }

  async addProposedDate(dt: string): Promise<void> {
    await this.proposedDateTimeInput.fill(dt);
    await this.addProposedDateButton.click();
  }

  async toggleAwayVotable(dateIndex: number): Promise<void> {
    // ponytail: beer.css hides native checkboxes; toggle via label text
    await this.awayVoteToggle(dateIndex)
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
