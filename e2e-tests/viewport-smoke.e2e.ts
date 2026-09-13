import type { Locator } from '@playwright/test';
import { expect, test } from './fixtures';
import { EditPage, JoinPage } from './pages';
import { setViewport, viewportNames } from './viewports';

// A narrow screen must not clip a control at the page edge: assert the
// element's box starts at or after 0 and ends at or before the viewport width.
async function expectInsideViewportWidth(locator: Locator): Promise<void> {
  const inside = await locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= window.innerWidth;
  });
  expect(inside)
    .toBe(true);
}

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

  test('set-all row wraps and every radio label is a 44px target on a 360px phone', async ({page, checkA11y}) => {
    await setViewport(page, 'phoneSmall');
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);
    const joinPage = await new JoinPage(page).goto(session.homeHref);
    await joinPage.join('Alice');

    // The longest set-all button wraps onto a second line instead of being
    // clipped at the right page edge.
    await expectInsideViewportWidth(
      joinPage.setAllControls.getByRole('button', {name: 'Set all: No', exact: true}),
    );

    // Every Yes / if necessary / No label is a >=44px touch target and stays
    // fully inside the viewport.
    const labels = joinPage.voteForm.locator('.vote-radio-group').first().locator('label');
    await expect(labels)
      .toHaveCount(3);
    for (const label of await labels.all()) {
      const box = await label.boundingBox();
      if (!box) {
        throw new Error('vote radio label has no bounding box');
      }
      expect(box.height)
        .toBeGreaterThanOrEqual(44);
      await expectInsideViewportWidth(label);
    }

    await checkA11y();
  });

  test('longer German radio labels stay inside a 360px phone', async ({page, checkA11y}) => {
    await setViewport(page, 'phoneSmall');
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);
    const joinPage = await new JoinPage(page).goto(session.homeHref);
    await joinPage.join('Alice');
    await joinPage.switchLanguage('de-CH');

    const labels = page.locator('.vote-radio-group').first().locator('label');
    await expect(labels)
      .toHaveCount(3);
    for (const label of await labels.all()) {
      await expectInsideViewportWidth(label);
    }

    await checkA11y();
  });

  test('desktop keeps each date\'s Yes / if necessary / No on one row', async ({page, checkA11y}) => {
    await setViewport(page, 'desktop');
    const {session} = await EditPage.createSession(page, ['2026-03-05T20:00']);
    const joinPage = await new JoinPage(page).goto(session.homeHref);
    await joinPage.join('Alice');

    const labels = joinPage.voteForm.locator('.vote-radio-group').first().locator('label');
    await expect(labels)
      .toHaveCount(3);
    const tops = await labels.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size)
      .toBe(1);

    await checkA11y();
  });
});
