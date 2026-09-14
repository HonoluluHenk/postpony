import { describe, expect, it } from 'vitest';
import { getTranslation, inputFormat, languageOptions } from '../locales';
import { ErrorPage, type ErrorPageProps } from './error';

function baseProps(overrides: Partial<ErrorPageProps> = {}): ErrorPageProps {
  return {
    t: (key, params) => getTranslation('en-US', key, params),
    locale: 'en-US',
    isPartial: false,
    baseUrl: 'https://game-scheduler.localhost:3000',
    inputFormat: inputFormat('en-US'),
    languageOptions: languageOptions(),
    ...overrides,
  };
}

function renderToString(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  return (node as { toString(): string }).toString();
}

describe('ErrorPage', () => {
  it('falls back to the translated title and to the message when no dedicated props are given', () => {
    const html = renderToString(ErrorPage(baseProps({message: 'Something broke'})));

    expect(html)
      .toContain('<title>Error</title>');
    expect(html)
      .toContain('Something broke');
  });
});