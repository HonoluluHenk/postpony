import { test } from './fixtures';
import { EditPage, JoinPage } from './pages';
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

test.describe('Vote page viewport smoke', () => {
  test('vote page is accessible at the phoneSmall viewport', async ({page, checkA11y}) => {
    await setViewport(page, 'phoneSmall');
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);
    const joinPage = await new JoinPage(page).goto(session.homeHref);
    await joinPage.join('Alice');

    await checkA11y();
  });
});
