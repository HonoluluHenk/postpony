import type { Page } from '@playwright/test';

export async function waitForIdle(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images, async image => image.decode()
        .catch(() => undefined)),
    );
  });
  await page.waitForLoadState('networkidle');
  await page.evaluate(
    () => new Promise<void>(resolve => {
      function onFrame(): void {
        requestAnimationFrame(resolveFrame);
      }

      function resolveFrame(): void {
        resolve();
      }

      requestAnimationFrame(onFrame);
    }),
  );
}
