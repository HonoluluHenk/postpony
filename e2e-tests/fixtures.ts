import AxeBuilder from '@axe-core/playwright';
import { test as base } from '@playwright/test';

interface AxeFixture {
  makeAxeBuilder: () => AxeBuilder;
  checkA11y: () => Promise<void>;
}

//noinspection JSUnusedGlobalSymbols
export const test = base.extend<AxeFixture>({
  makeAxeBuilder: async ({page}, use) => {
    const makeAxeBuilder = (): AxeBuilder => new AxeBuilder({page})
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']);
    await use(makeAxeBuilder);
  },

  checkA11y: async ({makeAxeBuilder}, use) => {
    const checkA11y = async (): Promise<void> => {
      const accessibilityScanResults = await makeAxeBuilder()
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        // Formating violations for better error reporting
        const violations = accessibilityScanResults.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.map(node => ({
            target: node.target,
            html: node.html,
            xpath: node.xpath,
          })),
        }));
        console.error('Accessibility violations found:', JSON.stringify(violations, null, 2));
      }

      base.expect(accessibilityScanResults.violations)
        .toEqual([]);
    };
    await use(checkA11y);
  },
});

export { expect } from '@playwright/test';
