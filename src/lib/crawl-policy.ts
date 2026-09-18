/**
 * Crawl and index policy for the whole app: only the start page (/) may be
 * crawled and indexed. `robots.txt`, `ai.txt`, and the request filter are all
 * generated from this one module so the advisory files and the enforcement layer
 * can never drift apart.
 */

const CRAWL_DISALLOW_PATHS = ['/create', '/edit', '/join', '/opponent', '/assets'] as const;

const AI_CRAWLER_USER_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Google-Agent',
  'CCBot',
  'Bytespider',
  'Applebot-Extended',
  'meta-externalagent',
  'meta-externalfetcher',
  'cohere-ai',
  'Amazonbot',
  'DuckAssistBot',
  'MistralAI-Index',
  'MistralAI-User',
] as const;

const BOT_USER_AGENT_TOKENS = [
  'bot', 'crawler', 'spider', 'scraper',
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandexbot', 'sogou', 'exabot',
  'gptbot', 'oai-searchbot', 'chatgpt-user', 'claudebot', 'anthropic-ai', 'claude-searchbot', 'claude-user',
  'perplexitybot', 'perplexity-user', 'google-extended', 'google-agent', 'ccbot', 'commoncrawl', 'bytespider',
  'applebot-extended', 'meta-externalagent', 'meta-externalfetcher', 'cohere-ai', 'amazonbot', 'duckassistbot',
  'mistralai-index', 'mistralai-user',
] as const;

function disallowLines(): string {
  return CRAWL_DISALLOW_PATHS.map((path) => `Disallow: ${path}`)
    .join('\n');
}

function agentStanza(userAgent: string): string {
  return `User-agent: ${userAgent}\n${disallowLines()}`;
}

export function robotsTxt(): string {
  const sections = [
    `User-agent: *\n${disallowLines()}`,
    '# Only the start page (/) may be crawled or indexed.',
    '# AI crawlers follow the same policy as general crawlers.',
    ...AI_CRAWLER_USER_AGENTS.map(agentStanza),
  ];
  return `${sections.join('\n\n')}\n`;
}

export function aiTxt(): string {
  const sections = [
    '# ai.txt: AI-agent crawl policy (draft convention, not a formal standard).',
    '# Only the start page (/) may be crawled; every other route is off-limits.',
    ...AI_CRAWLER_USER_AGENTS.map(agentStanza),
  ];
  return `${sections.join('\n\n')}\n`;
}

export function isBotUserAgent(userAgent: string | undefined): boolean {
  if (userAgent === undefined) {
    return false;
  }
  const normalized = userAgent.toLowerCase();
  return BOT_USER_AGENT_TOKENS.some((token) => normalized.includes(token));
}

export function isCrawlerAllowedPath(path: string): boolean {
  return path === '/' || path === '/robots.txt' || path === '/ai.txt' || path.startsWith('/assets');
}
