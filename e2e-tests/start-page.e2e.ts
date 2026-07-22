import { expect, test } from './fixtures';
import { StartPage } from './pages';

test.describe('Start Page', () => {
  let startPage: StartPage;

  test.beforeEach(async ({page}) => {
    startPage = await new StartPage(page)
      .goto();
  });

  test('should have the correct title and heading', async ({checkA11y}) => {
    await expect(startPage.welcomeHeading)
      .toContainText('Welcome to PostPony');

    await checkA11y();
  });

  test('should display the main action links', async ({checkA11y}) => {
    // These navigate, so they must be links (not buttons) for correct semantics.
    await expect(startPage.createLink)
      .toHaveAttribute('href', '/create');
    await expect(startPage.editLink)
      .toHaveAttribute('href', '/edit');

    await checkA11y();
  });

  test('should render an accessible, initially-hidden loading overlay', async ({checkA11y}) => {
    await expect(startPage.spinner)
      .toHaveAttribute('role', 'status');
    await expect(startPage.spinner)
      .toHaveAttribute('aria-hidden', 'true');
    await expect(startPage.spinner)
      .toBeHidden();

    await checkA11y();
  });

  test('should have a descriptive welcome message', async ({checkA11y}) => {
    await expect(startPage.welcomeText)
      .toBeVisible();

    await checkA11y();
  });

  test('should have a favicon', async ({page, checkA11y}) => {
    await expect(startPage.favicon)
      .toHaveAttribute('href', '/assets/logos/favicon.svg');

    const response = await page.request.get('/assets/logos/favicon.svg');
    expect(response.status())
      .toBe(200);
    expect(response.headers()['content-type'])
      .toContain('image/svg+xml');

    await checkA11y();
  });

  test('should display the brand logo linking home', async ({page, checkA11y}) => {
    await expect(startPage.logoLink)
      .toHaveAttribute('href', '/');
    await expect(startPage.logoImage)
      .toBeVisible();

    const response = await page.request.get('/assets/logos/wordmark.svg');
    expect(response.status())
      .toBe(200);
    expect(response.headers()['content-type'])
      .toContain('image/svg+xml');

    await checkA11y();
  });

  test('should not have any automatically detectable accessibility violations', async ({checkA11y}) => {
    await checkA11y();
  });

  test('accessibility landmarks check', async ({checkA11y}) => {
    // 1. Check for main landmark
    await expect(startPage.main)
      .toBeVisible();

    // 2. Check for unique H1
    await expect(startPage.banner.getByRole('heading', {level: 1}))
      .toHaveCount(1);
    await expect(startPage.banner.getByRole('heading', {level: 1}))
      .toContainText('PostPony');

    // 3. Header and Footer landmarks
    await expect(startPage.banner)
      .toBeVisible();
    await expect(startPage.contentinfo)
      .toBeVisible();

    await checkA11y();
  });
});
