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

  static async createSession(
    page: Page,
    dates?: string[],
    originalMatchDateTime?: string,
  ): Promise<{
    session: SessionFixture;
    editPage: EditPage
  }>
  {
    const createPage = await new CreatePage(page)
      .goto();
    const lang = await page.locator('html')
      .getAttribute('lang');
    const editPage = await createPage.create(
      originalMatchDateTime
        ? {originalMatchDateTime: isoToLocaleTokens(lang, originalMatchDateTime)}
        : {},
    );

    for (const [i, dt] of (dates ?? []).entries()) {
      await editPage.addProposedDate(dt);
      await expect(editPage.proposedDateRows)
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

  get spinner(): Locator {
    return this.page.locator('#global-spinner');
  }

  get status(): Locator {
    return this.page.getByText('Status:');
  }

  get changeMatchDetailsLink(): Locator {
    return this.page.getByRole('link', {name: 'Change match details'});
  }

  get matchSummary(): Locator {
    return this.page.locator('.match-summary');
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
    // ponytail: the generator's <ol> also has aria-label "Generate Proposed
    // Dates" which would collide with the fuzzy "Proposed Dates" substring
    // match; scope to the card container id so the proposal list stays singular.
    return this.page.locator('#proposed-date-list');
  }

  // The proposal card list's data cards — the index space every per-date
  // control (toggle, confirm, delete) uses.
  get proposedDateRows(): Locator {
    return this.proposedDateList.locator('.proposed-date-card');
  }

  get generateForm(): Locator {
    // ponytail: filter by the hidden `generate=tuple` discriminator so the
    // generator form never collides with the single-date form below it.
    return this.page.locator('form').filter({
      has: this.page.locator('input[name="generate"][value="tuple"]'),
    });
  }

  // ponytail: the row also carries the icon and switch aria-labels inside its
  // textContent, so the test reads the datetime display from the row's `.max`
  // div to get a parseable "Mo, Sep 30, 2026, 7:30 PM".
  async proposedDateDisplays(): Promise<string[]> {
    return this.proposedDateRows
      .locator('.max')
      .allTextContents();
  }

  generateTimeInput(index: number): Locator {
    return this.generateForm.locator(`input#time-${String(index)}`);
  }

  get generateSubmitButton(): Locator {
    // ponytail: "Generate" matches two buttons (the submit and a future nav
    // breadcrumb) — scope to the generator form to disambiguate.
    return this.generateForm.getByRole('button', {name: 'Generate', exact: true});
  }

  get fromDateInput(): Locator {
    return this.generateForm.getByLabel('From');
  }

  get toDateInput(): Locator {
    return this.generateForm.getByLabel('To');
  }

  get fromDateError(): Locator {
    return this.page.locator('#fromDate-error');
  }

  get toDateError(): Locator {
    return this.page.locator('#toDate-error');
  }

  async fillFromDate(isoDate: string): Promise<void> {
    await this.fromDateInput.fill(isoDate);
  }

  async fillToDate(isoDate: string): Promise<void> {
    await this.toDateInput.fill(isoDate);
  }

  // The generator form's venue dropdown (the single-date form carries a second
  // select with the same "Venue" label, so scope to the generator here).
  get generateVenueSelect(): Locator {
    return this.generateForm.getByLabel('Venue');
  }

  async generateProposedDates(rows: { weekday: number; time: string }[]): Promise<void> {
    // Fixed Monday-Sunday grid: weekday N maps to row index N-1.
    for (const row of rows) {
      await this.generateTimeInput(row.weekday - 1)
        .fill(row.time);
    }
    await this.generateSubmitButton.click();
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

  votableToggle(dateIndex: number): Locator {
    // ponytail: the switch is icon-only inside the "Votable" column (full
    // label only in aria-label/title), so locate the row's switch structurally
    // instead of by text. beer.css hides the native checkbox (opacity:0), so
    // the clickable/visible target is the label.
    return this.proposedDateRows
      .nth(dateIndex)
      .locator('label.switch');
  }

  async addProposedDate(dt: string): Promise<void> {
    const lang = await this.page.locator('html')
      .getAttribute('lang');
    await this.proposedDateTimeInput.fill(isoToLocaleTokens(lang, dt));
    await this.addProposedDateButton.click();
  }

  async toggleVotable(dateIndex: number): Promise<void> {
    // ponytail: beer.css hides native checkboxes; toggle via the switch label
    await this.votableToggle(dateIndex)
      .click();
  }

  votableCheckbox(dateIndex: number): Locator {
    return this.proposedDateRows
      .nth(dateIndex)
      .locator('input[type="checkbox"]');
  }

  confirmButton(dateIndex: number): Locator {
    return this.proposedDateRows
      .nth(dateIndex)
      .getByRole('button', {name: 'Confirm'});
  }

  deleteButton(dateIndex: number): Locator {
    // ponytail: the delete action is icon-only, so its accessible name comes
    // from aria-label rather than visible text.
    return this.proposedDateRows
      .nth(dateIndex)
      .getByRole('button', {name: 'Delete'});
  }

  deleteDialog(dateIndex: number): Locator {
    return this.proposedDateRows
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
