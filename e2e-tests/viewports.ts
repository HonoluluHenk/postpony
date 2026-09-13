import type { Page } from '@playwright/test';

// Named viewports shared by every responsive e2e check. Each layout fix ships
// with an assertion at the width where it broke, so one fix covers all
// breakpoints without duplicating the dimensions in each spec.
export const viewports = {
  phone: {width: 390, height: 844},
  tablet: {width: 820, height: 1180},
  desktop: {width: 1282, height: 745},
} as const;

export type ViewportName = keyof typeof viewports;

export const viewportNames = Object.keys(viewports) as ViewportName[];

export async function setViewport(page: Page, name: ViewportName): Promise<void> {
  await page.setViewportSize(viewports[name]);
}
