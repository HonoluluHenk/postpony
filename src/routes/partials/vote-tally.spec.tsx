import { describe, expect, it } from 'vitest';
import { getTranslation } from '../../locales';
import { VoteTally, type ProposedDateTally } from './vote-tally';

const t = (key: any, params?: any): string => getTranslation('en-US', key, params);

const sampleDates: ProposedDateTally[] = [
  { display: '10.10.2026 19:00', yes: 3, ifNecessary: 1, no: 0 },
  { display: '12.10.2026 20:00', yes: 1, ifNecessary: 2, no: 2 },
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
    expect(html).toContain('<caption class="visually-hidden">Vote Summary</caption>');
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
    expect(htmlH2).toContain('<caption class="visually-hidden">Custom Summary</caption>');

    const nodeH4 = VoteTally({
      proposedDates: sampleDates,
      t,
      headingLevel: 4,
    });
    const htmlH4 = renderToString(nodeH4);
    expect(htmlH4).toContain('<h4 id="vote-tally-title">Vote Summary</h4>');
  });

  it('wraps the tally in a closed details with the heading inside the summary when disclosure is set', () => {
    const node = VoteTally({ proposedDates: sampleDates, t, disclosure: true });
    const html = renderToString(node);

    expect(html).toContain('<details>');
    expect(html).toContain('</details>');
    expect(html).toMatch(/<summary>\s*<h3 id="vote-tally-title">Vote Summary<\/h3>\s*<\/summary>/);
    // Closed by default: no `open` attribute on the details.
    expect(html).not.toContain('<details open');
    // The table sits inside the details, after the summary.
    expect(html).toMatch(/<\/summary>\s*<table>/);
  });

  it('keeps the heading outside any disclosure when disclosure is not set', () => {
    const html = renderToString(VoteTally({ proposedDates: sampleDates, t }));

    expect(html).not.toContain('<details');
    expect(html).not.toContain('<summary');
    expect(html).toContain('<h3 id="vote-tally-title">Vote Summary</h3>');
  });

  it('renders table headers and tally values for each date', () => {
    const node = VoteTally({ proposedDates: sampleDates, t });
    const html = renderToString(node);

    expect(html).toContain('<th scope="col">Proposed Date &amp; Time</th>');
    expect(html).toContain('<th scope="col" class="num">Yes</th>');
    expect(html).toContain('<th scope="col" class="num">if necessary</th>');
    expect(html).toContain('<th scope="col" class="num">No</th>');

    expect(html).toContain('<td data-label="Proposed Date &amp; Time">10.10.2026 19:00</td>');
    expect(html).toContain('<td data-label="Yes" class="num">3</td>');
    expect(html).toContain('<td data-label="if necessary" class="num">1</td>');
    expect(html).toContain('<td data-label="No" class="num">0</td>');

    expect(html).toContain('<td data-label="Proposed Date &amp; Time">12.10.2026 20:00</td>');
    expect(html).toContain('<td data-label="Yes" class="num">1</td>');
    expect(html).toContain('<td data-label="if necessary" class="num">2</td>');
    expect(html).toContain('<td data-label="No" class="num">2</td>');
  });
});
