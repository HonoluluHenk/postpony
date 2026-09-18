import { describe, expect, it } from 'vitest';
import { aiTxt, isBotUserAgent, isCrawlerAllowedPath, robotsTxt } from './crawl-policy';

describe('crawl policy text', () => {
  it('robots.txt allows only the start page for the catch-all group', () => {
    const body = robotsTxt();

    expect(body)
      .toContain('User-agent: *');
    for (const path of ['/create', '/edit', '/join', '/opponent', '/assets']) {
      expect(body)
        .toContain(`Disallow: ${path}`);
    }
  });

  it('robots.txt lists AI crawlers with the same policy', () => {
    const body = robotsTxt();

    expect(body)
      .toContain('User-agent: GPTBot');
    expect(body)
      .toContain('User-agent: ClaudeBot');
    expect(body)
      .toContain('User-agent: PerplexityBot');
    expect(body)
      .toContain('User-agent: Google-Extended');
  });

  it('ai.txt mirrors the AI stanzas without a catch-all group', () => {
    const body = aiTxt();

    expect(body)
      .toContain('User-agent: GPTBot');
    expect(body)
      .toContain('Disallow: /join');
    expect(body)
      .not
      .toContain('User-agent: *');
  });
});

describe('isBotUserAgent', () => {
  it('detects known robots and AI agents case-insensitively', () => {
    expect(isBotUserAgent('Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)'))
      .toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0)'))
      .toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)'))
      .toBe(true);
    expect(isBotUserAgent('SomeRoboCrawler/2.1'))
      .toBe(true);
    expect(isBotUserAgent('Slackbot-LinkExpanding 1.0'))
      .toBe(true);
  });

  it('does not flag browsers or missing headers', () => {
    expect(isBotUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0'))
      .toBe(false);
    expect(isBotUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Chrome/131.0 Safari/537.36'))
      .toBe(false);
    expect(isBotUserAgent('curl/8.5.0'))
      .toBe(false);
    expect(isBotUserAgent(''))
      .toBe(false);
    expect(isBotUserAgent(undefined))
      .toBe(false);
  });
});

describe('isCrawlerAllowedPath', () => {
  it('allows only the start page, the policy files, and static assets', () => {
    expect(isCrawlerAllowedPath('/'))
      .toBe(true);
    expect(isCrawlerAllowedPath('/robots.txt'))
      .toBe(true);
    expect(isCrawlerAllowedPath('/ai.txt'))
      .toBe(true);
    expect(isCrawlerAllowedPath('/assets/logo.svg'))
      .toBe(true);

    expect(isCrawlerAllowedPath('/create'))
      .toBe(false);
    expect(isCrawlerAllowedPath('/edit/abc'))
      .toBe(false);
    expect(isCrawlerAllowedPath('/join/abc/home'))
      .toBe(false);
    expect(isCrawlerAllowedPath('/opponent/abc'))
      .toBe(false);
  });
});
