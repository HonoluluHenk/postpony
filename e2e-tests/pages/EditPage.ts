import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import type { SessionFixture } from '../test-session';
import { isoToLocaleDateTokens, isoToLocaleTokens } from './locale-tokens';
import { ScrapePage } from './ScrapePage';

// The fixture drilldown that backs every e2e session: MTTV 2026/27 → O40
// 1. Liga → Ostermundigen. The return match (14.01.2027) has Ostermundigen as
// the home side, so the organizer claims the home team — the same orientation
// the manual create path used.
const SCRAPE_LEAGUE = 'MTTV 2026/27';
const SCRAPE_GROUP = 'O40 1. Liga';
const SCRAPE_TEAM = 'Ostermundigen';
const SCRAPE_MATCH = '14.01.2027';

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
  ): Promise<{
    session: SessionFixture;
    editPage: EditPage
  }>
  {
    const scrapePage = await new ScrapePage(page)
      .goto();
    await scrapePage.pickLeague(SCRAPE_LEAGUE);
    await scrapePage.pickGroup(SCRAPE_GROUP);
    await scrapePage.pickTeam(SCRAPE_TEAM);
    await expect(scrapePage.matchesHeading)
      .toBeVisible();
    await Promise.all([
      page.waitForURL(/\/edit\/.+/),
      scrapePage.selectButton(SCRAPE_MATCH)
        .click(),
    ]);
    const editPage = new EditPage(page);

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

  // The redesign renders the single-line page headline (match + original
  // datetime) in the Layout h1, so the accessible name is the visible headline
  // text rather than a fixed "Editing Postponement" string. Tests assert the
  // match/date via `toContainText`.
  get heading(): Locator {
    return this.page.getByRole('heading', {level: 1});
  }

  get spinner(): Locator {
    return this.page.locator('#global-spinner');
  }

  get status(): Locator {
    return this.page.locator('#status-chip');
  }

  get changeMatchDetailsLink(): Locator {
    return this.page.getByRole('link', {name: 'Change match details'});
  }

  get organizerPasswordToast(): Locator {
    return this.page.getByRole('status')
      .filter({hasText: 'Your Organizer Password is'});
  }

  get organizerPasswordCopyButton(): Locator {
    return this.organizerPasswordToast.locator('button.copy-btn');
  }

  get organizerPassword(): Promise<string | null> {
    return this.page.getByText('Your Organizer Password is')
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
    return this.page.getByRole('button', {name: 'Open calendar', exact: true});
  }

  // The redesigned rail carries the week-grouped date list in a single section;
  // the add-date form and the date rows are all scoped under it.
  get proposedDateList(): Locator {
    return this.page.locator('#proposed-dates-management');
  }

  // The dense date rows — the index space every per-date control (votable,
  // confirm, delete) uses.
  get proposedDateRows(): Locator {
    return this.proposedDateList.locator('.date-row');
  }

  // One ISO-week divider per week the proposed dates span.
  get weekHeads(): Locator {
    return this.proposedDateList.locator('.week-head');
  }

  get generateForm(): Locator {
    // ponytail: filter by the hidden `generate=tuple` discriminator so the
    // generator form never collides with the single-date form above it.
    return this.page.locator('form').filter({
      has: this.page.locator('input[name="generate"][value="tuple"]'),
    });
  }

  // The date-cell is split across `.date-day/.date-num/.date-time/.date-year`
  // spans, so reconstruct a single parseable datetime string per row
  // (e.g. "March 5 2026 8:00 PM").
  async proposedDateDisplays(): Promise<string[]> {
    return this.proposedDateRows.locator('.date-cell')
      .evaluateAll((els) => els.map((el) => {
        const num = el.querySelector('.date-num')?.textContent ?? '';
        const year = el.querySelector('.date-year')?.textContent ?? '';
        const time = el.querySelector('.date-time')?.textContent ?? '';
        return `${num} ${year} ${time}`.trim();
      }));
  }

  // The generator lives in a collapsible sidebar disclosure that the redesign
  // closes on phones (so the week rail is the first thing seen). Call this
  // before reading the time grid at a phone/tablet width.
  async openGenerateForm(): Promise<void> {
    const details = this.page.locator('details.side-details', {hasText: 'Generate Proposed Dates'});
    if ((await details.getAttribute('open')) !== '') {
      await details.locator('summary')
        .click();
    }
  }

  generateTimeInput(index: number): Locator {
    return this.generateForm.locator(`input#time-${String(index)}`);
  }

  // One time-only picker trigger per weekday row (aria-label set per locale).
  get generateTimePickerButtons(): Locator {
    return this.generateForm.getByRole('button', {name: 'Open time picker'});
  }

  generateTimePickerButton(index: number): Locator {
    return this.generateTimePickerButtons.nth(index);
  }

  get generateSubmitButton(): Locator {
    // ponytail: "Generate" matches two buttons (the submit and a future nav
    // breadcrumb) — scope to the generator form to disambiguate.
    return this.generateForm.getByRole('button', {name: 'Generate', exact: true});
  }

  get fromDateInput(): Locator {
    return this.generateForm.getByLabel('From', {exact: true});
  }

  get toDateInput(): Locator {
    return this.generateForm.getByLabel('To', {exact: true});
  }

  get fromDatePickerButton(): Locator {
    return this.generateForm.getByRole('button', {name: 'Open calendar for the From date'});
  }

  get toDatePickerButton(): Locator {
    return this.generateForm.getByRole('button', {name: 'Open calendar for the To date'});
  }

  get fromDateError(): Locator {
    return this.page.locator('#fromDate-error');
  }

  get toDateError(): Locator {
    return this.page.locator('#toDate-error');
  }

  // The generator's From/To are locale-token text fields; convert the ISO date
  // argument to the page's date tokens (en-US month-first default) before
  // filling, so callers keep passing plain ISO dates.
  private async dateTokens(isoDate: string): Promise<string> {
    const lang = await this.page.locator('html')
      .getAttribute('lang');
    return isoToLocaleDateTokens(lang, isoDate);
  }

  async fillFromDate(isoDate: string): Promise<void> {
    await this.fromDateInput.fill(await this.dateTokens(isoDate));
  }

  async fillToDate(isoDate: string): Promise<void> {
    await this.toDateInput.fill(await this.dateTokens(isoDate));
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

  get exportCalendarLink(): Locator {
    return this.page.getByRole('link', {name: 'Export as calendar (.ics)'});
  }

  get clipboardStatus(): Locator {
    return this.page.locator('#clipboard-status');
  }

  // ---- Vote dots (replaces the removed home/away/own-team tally tables). ----
  voteDotCount(dateIndex: number): Locator {
    return this.proposedDateRows
      .nth(dateIndex)
      .locator('.vote-dot-count');
  }

  voteDots(dateIndex: number): Locator {
    return this.proposedDateRows
      .nth(dateIndex)
      .locator('.vote-dots .vote-dot');
  }

  homeCopyButton(): Locator {
    return this.page.locator('.invite span')
      .filter({has: this.homeInviteLink})
      .locator('button.copy-btn');
  }

  awayCopyButton(): Locator {
    return this.page.locator('.invite span')
      .filter({has: this.awayInviteLink})
      .locator('button.copy-btn');
  }

  votableToggle(dateIndex: number): Locator {
    // ponytail: beer.css hides the native checkbox (opacity:0), so the
    // clickable/visible target is the `.action--votable` label.
    return this.proposedDateRows
      .nth(dateIndex)
      .locator('label.action--votable');
  }

  async addProposedDate(dt: string): Promise<void> {
    const lang = await this.page.locator('html')
      .getAttribute('lang');
    await this.proposedDateTimeInput.fill(isoToLocaleTokens(lang, dt));
    await this.addProposedDateButton.click();
  }

  async toggleVotable(dateIndex: number): Promise<void> {
    // ponytail: beer.css hides native checkboxes; toggle via the label
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
      .getByRole('button', {name: 'Confirm Date', exact: true});
  }

  deleteButton(dateIndex: number): Locator {
    // ponytail: the delete action is icon-only with an aria-label; the row also
    // carries a second "Delete" text button inside the confirm dialog, so target
    // the opener structurally instead of by accessible name.
    return this.proposedDateRows
      .nth(dateIndex)
      .locator('button[data-open-dialog]');
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
