import { test } from './fixtures';
import { EditPage } from './pages';
import { setViewport, viewportNames } from './viewports';

test.describe('Edit page viewport smoke', () => {
  for (const name of viewportNames) {
    test(`edit page is accessible at the ${name} viewport`, async ({page, checkA11y}) => {
      await setViewport(page, name);
      await EditPage.createSession(page, ['2026-03-05T20:00']);
      await checkA11y();
    });
  }
});
