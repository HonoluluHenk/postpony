import type { Page } from '@playwright/test';
import { expect } from './fixtures';

/**
 * Structural semantic assertions for the semantic-structure regression net
 * (spec: .scratch/semantic-html-fixes/). Each fails if a template edit
 * silently reintroduces a defect that axe cannot see.
 */

/**
 * Every `<i>` icon on the page must be decorative (aria-hidden). A bare
 * material-icon glyph leaks its text into the accessibility tree.
 */
export async function expectAllIconsHidden(page: Page): Promise<void> {
  await expect(page.locator('i:not([aria-hidden])'))
    .toHaveCount(0);
}

/**
 * The heading outline must have exactly one `h1` and never skip a level
 * (e.g. h3 → h5). Mirrors the axe `heading-order` rule for non-axe routes.
 */
export async function expectNoSkippedHeadings(page: Page): Promise<void> {
  const levels: number[] = await page.locator('h1, h2, h3, h4, h5, h6')
    .evaluateAll((els) => els.map((el) => Number(el.tagName.slice(1))));

  expect(levels.filter((level) => level === 1))
    .toHaveLength(1);

  let previous = levels[0] ?? 0;
  for (const level of levels.slice(1)) {
    expect(level, `heading level skip: h${previous} → h${level}`)
      .toBeLessThanOrEqual(previous + 1);
    previous = level;
  }
}

/**
 * No radio input on the page may claim required. The join page's "pick an
 * existing player" group is optional (mutually exclusive with a new name).
 */
export async function expectNoRequiredRadios(page: Page): Promise<void> {
  await expect(page.locator('input[type="radio"][aria-required], input[type="radio"][required]'))
    .toHaveCount(0);
}