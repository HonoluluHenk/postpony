import { describe, expect, it } from 'vitest';
import { getTranslation } from '../../locales';
import { VoteTally, type ProposedDateTally } from './vote-tally';

const t = (key: any, params?: any): string => getTranslation('en-US', key, params);

const sampleDates: ProposedDateTally[] = [
  { display: '10.10.2026 19:00', yes: 3, maybe: 1, no: 0 },
  { display: '12.10.2026 20:00', yes: 1, maybe: 2, no: 2 },
];

function renderToString(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  return (node as { toString(): string }).toString();
}

describe('VoteTally component', () => {
  it('collapses to null when proposedDates list is empty', () => {
    const result = VoteTally({ proposedDates: [], t });
    expect(result).toBeNull();
  });

  it('renders heading level 3 by default with default title and id', () => {
    const node = VoteTally({ proposedDates: sampleDates, t });
    expect(node).not.toBeNull();
    const html = renderToString(node);

    expect(html).toContain('<h3 id="vote-tally-title">Vote Summary</h3>');
    expect(html).toContain('<caption>Vote Summary</caption>');
  });

  it('supports custom heading-level variants and custom titleId/title', () => {
    const nodeH2 = VoteTally({
      proposedDates: sampleDates,
      t,
      headingLevel: 2,
      titleId: 'custom-h2-title',
      title: 'Custom Summary',
    });
    const htmlH2 = renderToString(nodeH2);
    expect(htmlH2).toContain('<h2 id="custom-h2-title">Custom Summary</h2>');
    expect(htmlH2).toContain('<caption>Custom Summary</caption>');

    const nodeH4 = VoteTally({
      proposedDates: sampleDates,
      t,
      headingLevel: 4,
    });
    const htmlH4 = renderToString(nodeH4);
    expect(htmlH4).toContain('<h4 id="vote-tally-title">Vote Summary</h4>');
  });

  it('renders table headers and tally values for each date', () => {
    const node = VoteTally({ proposedDates: sampleDates, t });
    const html = renderToString(node);

    expect(html).toContain('<th scope="col">Proposed Date &amp; Time</th>');
    expect(html).toContain('<th scope="col">Yes</th>');
    expect(html).toContain('<th scope="col">Maybe</th>');
    expect(html).toContain('<th scope="col">No</th>');

    expect(html).toContain('<td data-label="Proposed Date &amp; Time">10.10.2026 19:00</td>');
    expect(html).toContain('<td data-label="Yes">3</td>');
    expect(html).toContain('<td data-label="Maybe">1</td>');
    expect(html).toContain('<td data-label="No">0</td>');

    expect(html).toContain('<td data-label="Proposed Date &amp; Time">12.10.2026 20:00</td>');
    expect(html).toContain('<td data-label="Yes">1</td>');
    expect(html).toContain('<td data-label="Maybe">2</td>');
    expect(html).toContain('<td data-label="No">2</td>');
  });
});
