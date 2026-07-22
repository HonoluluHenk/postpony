import type { Locator, Page } from '@playwright/test';
import { EditPage } from './EditPage';

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

  get nameInput(): Locator {
    return this.page.getByLabel('Postponement Name');
  }

  get submitButton(): Locator {
    return this.page.getByRole('button', {name: 'Create Postponement'});
  }

  async create(name: string): Promise<EditPage> {
    await this.nameInput.fill(name);
    await this.submitButton.click();
    await this.page.waitForURL(/\/edit\/.+/);
    return new EditPage(this.page);
  }
}
