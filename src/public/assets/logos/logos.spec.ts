import { parse } from 'node-html-parser';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const variants = ['icon.svg', 'wordmark.svg', 'favicon.svg'] as const;

describe('PostPony logo variants', () => {
  it.each(variants)('%s is well-formed and carries accessible metadata', (file) => {
    const svg = readFileSync(join(here, file), 'utf8');
    const root = parse(svg);

    const el = root.querySelector('svg');
    expect(el, 'root <svg> element')
      .not
      .toBeNull();
    expect(el?.getAttribute('role'))
      .toBe('img');

    const title = root.querySelector('title');
    expect(title?.text)
      .toBe('PostPony');
  });
});
