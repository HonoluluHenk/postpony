import { expect, type Locator, type Page } from '@playwright/test';

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

  get scrapeLink(): Locator {
    return this.page.getByRole('link', {name: 'Find your match (click-tt.ch)'});
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
    // The lang query is stripped by a server redirect, so wait on the settled <html lang>.
    await expect(this.page.locator('html'))
      .toHaveAttribute('lang', locale);
  }
}
