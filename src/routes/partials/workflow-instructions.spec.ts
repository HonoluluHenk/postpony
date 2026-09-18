import { describe, expect, test } from 'vitest';
import { renderToString } from 'hono/jsx/dom/server';
import { getTranslation, type TranslationKeys } from '../../locales';
import { WorkflowInstructions } from './workflow-instructions';

const t = (key: TranslationKeys): string => getTranslation('en-US', key);

const base = {
  id: 'organizer-workflow',
  storageKey: 'postpony-workflow-organizer',
  heading: t('workflow_heading'),
  steps: [t('workflow_organizer_step1')],
  confirmedNote: t('workflow_organizer_confirmed'),
};

describe('WorkflowInstructions', () => {
  test('renders the step list and the strong tip while voting is open', () => {
    const html = renderToString(WorkflowInstructions({
      ...base,
      tip: t('workflow_sort_tip'),
      confirmed: false,
    }));

    expect(html)
      .toContain('<li>');
    expect(html)
      .toContain('<strong>Tip:</strong>');
    expect(html)
      .not
      .toContain(t('workflow_organizer_confirmed'));
  });

  test('omits an absent tip and swaps in-band without isOob', () => {
    const html = renderToString(WorkflowInstructions({
      ...base,
      confirmed: false,
    }));

    expect(html)
      .not
      .toContain('<strong>');
    expect(html)
      .not
      .toContain('hx-swap-oob');
  });

  test('condenses to the confirmed note and ships hx-swap-oob when OOB', () => {
    const html = renderToString(WorkflowInstructions({
      ...base,
      confirmed: true,
      isOob: true,
    }));

    expect(html)
      .not
      .toContain('<li>');
    expect(html)
      .toContain('voting is closed');
    expect(html)
      .toContain('hx-swap-oob="true"');
  });
});
