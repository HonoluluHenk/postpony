import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => ({
  existsSync: (): boolean => false,
  loadEnvFile: (): void => undefined,
  readFileSync: (): never => {
    throw new Error('node:fs.readFileSync was called');
  },
  readFile: (): never => {
    throw new Error('node:fs.readFile was called');
  },
}));

vi.mock('../config', () => ({
  default: {
    get: (key: string): string => (key === 'template-source' ? 'memory' : ''),
  },
}));

import { App } from '../app';

const mockContext = {
  get: vi.fn(),
  req: {
    param: (_name: string): string | undefined => undefined,
    query: (_name: string): string | undefined => undefined,
    header: (_name: string): string | undefined => undefined,
    url: 'http://localhost/',
  },
} as any;

function createApp(): App {
  return App.create(mockContext);
}

describe('Eta template rendering — in-memory map (no node:fs)', () => {
  beforeEach(() => {
    process.env['APP_TEMPLATE_SOURCE'] = 'memory';
    vi.resetAllMocks();
    mockContext.get.mockReturnValue('en-US');
  });

  afterEach(() => {
    delete process.env['APP_TEMPLATE_SOURCE'];
  });

  it('renders a full layout chain from the in-memory map', () => {
    const app = createApp();

    const html = app.render('index.eta', { title: 'PostPony' });

    expect(html).toContain('<html lang="en-US">');
    expect(html).toContain('<title>PostPony</title>');
    expect(html).toContain('Welcome to PostPony');
    expect(html).toContain('Create a new Postponement');
    // error-container partial is included by the layout
    expect(html).toContain('id="error-container"');
  });

  it('does not touch node:fs while rendering', () => {
    const app = createApp();
    // If the in-memory map fell back to disk loading, the mocked readFileSync
    // above would throw. The absence of a throw proves no fs access.
    expect(() => app.render('index.eta', { title: 'PostPony' })).not.toThrow();
  });
});
