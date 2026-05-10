import { test as base } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type AxeFixture = {
  makeAxeBuilder: () => AxeBuilder;
  checkA11y: () => Promise<void>;
};

export const test = base.extend<AxeFixture>({
  makeAxeBuilder: async ({ page }, use) => {
    const makeAxeBuilder = () => new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']);
    await use(makeAxeBuilder);
  },
  checkA11y: async ({ page, makeAxeBuilder }, use) => {
    const checkA11y = async () => {
      const accessibilityScanResults = await makeAxeBuilder().analyze();
      if (accessibilityScanResults.violations.length > 0) {
        // Formating violations for better error reporting
        const violations = accessibilityScanResults.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length
        }));
        console.error('Accessibility violations found:', JSON.stringify(violations, null, 2));
      }
      base.expect(accessibilityScanResults.violations).toEqual([]);
    };
    await use(checkA11y);
  },
});
