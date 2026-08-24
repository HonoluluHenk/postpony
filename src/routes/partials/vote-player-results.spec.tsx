import { describe, expect, it } from 'vitest';
import { getTranslation } from '../../locales';
import { VotePlayerResults, type PlayerVoteRow } from './vote-player-results';
import type { ProposedDateTally } from './vote-tally';

const t = (key: any, params?: any): string => getTranslation('en-US', key, params);

const sampleDates: ProposedDateTally[] = [
  { display: '10.10.2026 19:00', yes: 1, maybe: 0, no: 0 },
];

const sampleRows: PlayerVoteRow[] = [
  { playerName: 'Alice', votes: ['Yes'] },
  { playerName: 'Bob', votes: [null] },
];

function renderToString(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  return (node as { toString(): string }).toString();
}

describe('VotePlayerResults component', () => {
  it('returns null when proposedDates is empty', () => {
    const result = VotePlayerResults({
      proposedDates: [],
      playerVoteRows: sampleRows,
      t,
    });
    expect(result).toBeNull();
  });

  it('renders player vote matrix and embedded vote tally', () => {
    const node = VotePlayerResults({
      proposedDates: sampleDates,
      playerVoteRows: sampleRows,
      t,
    });
    expect(node).not.toBeNull();
    const html = renderToString(node);

    expect(html).toContain('<h3 id="vote-results-title">Your Team&#39;s Votes</h3>');
    expect(html).toContain('Alice');
    expect(html).toContain('Bob');
    expect(html).toContain('Yes');
    expect(html).toContain('No vote');
    expect(html).toContain('<h4 id="vote-tally-title">Vote Summary</h4>');
  });
});
