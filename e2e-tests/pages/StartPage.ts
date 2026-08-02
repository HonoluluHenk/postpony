import type { Locator, Page } from '@playwright/test';

export class StartPage {
  constructor(private readonly page: Page) {
  }

  async goto(): Promise<StartPage> {
    await this.page.goto('/');
    return this;
  }

  get welcomeHeading(): Locator {
    return this.page.getByRole('heading', {level: 2});
  }

  get createLink(): Locator {
    return this.page.getByRole('link', {name: 'Create a new Postponement'});
  }

  get editLink(): Locator {
    return this.page.getByRole('link', {name: 'Edit an existing Postponement'});
  }

  get spinner(): Locator {
    return this.page.locator('#global-spinner');
  }

  get welcomeText(): Locator {
    return this.page.getByText('Postponing games as quick and easy as the Pony Express.');
  }

  get favicon(): Locator {
    return this.page.locator('link[rel="icon"]');
  }

  get logoLink(): Locator {
    return this.page.getByRole('banner')
      .getByRole('link', {name: 'PostPony home'});
  }

  get logoImage(): Locator {
    return this.logoLink.locator('img[src="/assets/logos/wordmark.svg"]');
  }

  get main(): Locator {
    return this.page.getByRole('main');
  }

  get banner(): Locator {
    return this.page.getByRole('banner');
  }

  get contentinfo(): Locator {
    return this.page.getByRole('contentinfo');
  }

  languageNav(name: string): Locator {
    return this.page.getByRole('navigation', {name});
  }

  async switchLanguage(locale: string): Promise<void> {
    await this.page.locator('#language-select')
      .selectOption(locale);
  }
}
