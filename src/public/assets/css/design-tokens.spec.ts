import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

const read = (path: string): string => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const tokensCss = read('./design-tokens.css');
const styleCss = read('./style.css');

function rootDeclarations(): string {
  const match = /:root\s*{([\s\S]*?)}/.exec(tokensCss);
  if (match === null) {
    throw new Error('design-tokens.css declares no :root block');
  }
  return match[1] ?? '';
}

describe('design tokens — app-wide type family and color-scheme', () => {
  it('leads the app-wide --font with the self-hosted Plex face and keeps the vendor stack as fallback', () => {
    expect(rootDeclarations())
      .toContain("--font: 'IBM Plex Sans', 'Inter'");
    expect(rootDeclarations())
      .toContain("'Nimbus Sans', 'Noto Sans', 'Arial', sans-serif");
  });

  it('reuses the single family token for --font-sans', () => {
    expect(rootDeclarations())
      .toContain('--font-sans: var(--font);');
  });

  it('declares color-scheme: light on :root', () => {
    expect(rootDeclarations())
      .toContain('color-scheme: light;');
  });

  it('sources the theme-color token from the surface token', () => {
    expect(rootDeclarations())
      .toContain('--theme-color: var(--surface);');
  });

  it('keeps the condensed face scoped to the edit date cells only', () => {
    expect(styleCss)
      .toMatch(/\.edit-redesign \.date-cell,\s*\n\s*\.edit-redesign \.date-num\s*\{\s*font-family: var\(--font-condensed\);/);
  });
});
