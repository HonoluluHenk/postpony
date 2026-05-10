import { test, expect } from '@playwright/test';

test.describe('Start Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have the correct title and heading', async ({ page }) => {
    await expect(page).toHaveTitle(/Game Re-scheduler/);
    await expect(page.locator('h2')).toContainText('Welcome to the Game Re-scheduler');
  });

  test('should display the main action buttons', async ({ page }) => {
    const createButton = page.getByRole('button', { name: 'Create a new ReSchedule' });
    const editButton = page.getByRole('button', { name: 'Edit an existing ReSchedule' });

    await expect(createButton).toBeVisible();
    await expect(editButton).toBeVisible();
  });

  test('should have a descriptive welcome message', async ({ page }) => {
    await expect(page.locator('main p')).toContainText('Streamline your sports match rescheduling with ease.');
  });

  test('accessibility check', async ({ page }) => {
    // Basic accessibility checks
    // 1. Check for main landmark
    await expect(page.locator('main')).toBeVisible();

    // 2. Check for unique H1
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('Game Re-scheduler');

    // 3. Header and Footer landmarks
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });
});
