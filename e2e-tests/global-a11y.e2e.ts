import { test } from './fixtures';

test.describe('Accessibility check for all routes', () => {
  const routes = [
    {name: 'Home', path: '/'},
    {name: 'Create', path: '/create'},
    {name: 'Edit', path: '/edit'},
  ];

  for (const route of routes) {
    test(`route ${route.name} (${route.path}) should be accessible`, async ({page, checkA11y}) => {
      await page.goto(route.path);
      await checkA11y();
    });
  }
});
