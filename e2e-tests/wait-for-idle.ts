import type { Page } from '@playwright/test';

// Await web-font loading before taking a screenshot. A screenshot captured
// while a fallback font is still swapping in has different text metrics than
// the committed baseline, which trips the 2 % screenshot tolerance. `ready`
// resolves once every font requested so far has finished loading.
export async function waitForIdle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
}
