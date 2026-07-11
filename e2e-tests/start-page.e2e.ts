import { expect, test } from './fixtures';

test.describe('Start Page', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
  });

  test('should have the correct title and heading', async ({page}) => {
    await expect(page)
      .toHaveTitle(/PostPony/);
    await expect(page.getByRole('heading', {level: 2}))
      .toContainText('Welcome to PostPony');
  });

  test('should display the main action links', async ({page}) => {
    // These navigate, so they must be links (not buttons) for correct semantics.
    const createLink = page.getByRole('link', {name: 'Create a new Postponement'});
    const editLink = page.getByRole('link', {name: 'Edit an existing Postponement'});

    await expect(createLink)
      .toHaveAttribute('href', '/create');
    await expect(editLink)
      .toHaveAttribute('href', '/edit');
  });

  test('should render an accessible, initially-hidden loading overlay', async ({page}) => {
    const spinner = page.locator('#global-spinner');
    await expect(spinner)
      .toHaveAttribute('role', 'status');
    await expect(spinner)
      .toHaveAttribute('aria-hidden', 'true');
    await expect(spinner)
      .toBeHidden();
  });

  test('should have a descriptive welcome message', async ({page}) => {
    await expect(page.getByText('Postponing games as quick and easy as the Pony Express.'))
      .toBeVisible();
  });

  test('should have a favicon', async ({page}) => {
    const favicon = page.locator('link[rel="icon"]');
    await expect(favicon)
      .toHaveAttribute('href', '/assets/favicon.svg');

    const response = await page.request.get('/assets/favicon.svg');
    expect(response.status())
      .toBe(200);
    expect(response.headers()['content-type'])
      .toContain('image/svg+xml');
  });

  test('should display the brand logo linking home', async ({page}) => {
    const logoLink = page.getByRole('banner')
      .getByRole('link', {name: 'PostPony home'});
    await expect(logoLink)
      .toHaveAttribute('href', '/');

    const logo = logoLink.locator('img[src="/assets/logo.svg"]');
    await expect(logo)
      .toBeVisible();

    const response = await page.request.get('/assets/logo.svg');
    expect(response.status())
      .toBe(200);
    expect(response.headers()['content-type'])
      .toContain('image/svg+xml');
  });

  test('should not have any automatically detectable accessibility violations', async ({checkA11y}) => {
    await checkA11y();
  });

  test('accessibility landmarks check', async ({page}) => {
    // 1. Check for main landmark
    await expect(page.getByRole('main'))
      .toBeVisible();

    // 2. Check for unique H1
    await expect(page.getByRole('heading', {level: 1}))
      .toHaveCount(1);
    await expect(page.getByRole('heading', {level: 1}))
      .toContainText('PostPony');

    // 3. Header and Footer landmarks
    await expect(page.getByRole('banner'))
      .toBeVisible();
    await expect(page.getByRole('contentinfo'))
      .toBeVisible();
  });
});
