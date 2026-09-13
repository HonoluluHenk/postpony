import { describe, expect, it } from 'vitest';
import { getTranslation, languageOptions } from '../../locales';
import { Layout, type LayoutProps } from './main';

const t = (key: any, params?: any): string => getTranslation('en-US', key, params);

function baseProps(): LayoutProps {
  return {
    title: 'PostPony',
    t,
    locale: 'en-US',
    baseUrl: 'https://game-scheduler.localhost:3000',
    inputFormat: 'MM/dd/yyyy hh:mm aa',
    isPartial: false,
    languageOptions: languageOptions(),
  };
}

function renderToString(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  return (node as { toString(): string }).toString();
}

describe('Layout page shell', () => {
  it('declares a theme-color meta matching the light-surface body background', () => {
    const html = renderToString(Layout(baseProps()));

    expect(html)
      .toContain('<meta name="theme-color" content="#fdf8fd"/>');
  });

  it('sizes the logo image from the SVG aspect ratio at height 40', () => {
    const html = renderToString(Layout(baseProps()));

    expect(html)
      .toContain('height="40" width="155"');
  });

  it('computes the footer year at render time', () => {
    const html = renderToString(Layout(baseProps()));

    expect(html)
      .toContain(`\u00a9 ${String(new Date().getFullYear())} PostPony`);
    expect(html)
      .not
      .toContain('2024');
  });
});
