import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config', () => ({
  default: {
    get: (key: string): string => (key === 'template-source' ? 'disk' : ''),
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

describe('Eta template rendering — disk loading (dev)', () => {
  beforeEach(() => {
    process.env['APP_TEMPLATE_SOURCE'] = 'disk';
    vi.resetAllMocks();
    mockContext.get.mockReturnValue('en-US');
  });

  afterEach(() => {
    delete process.env['APP_TEMPLATE_SOURCE'];
  });

  it('renders the same HTML via on-disk templates', () => {
    const app = createApp();
    const html = app.render('index.eta', { title: 'PostPony' });
    expect(html).toContain('<html lang="en-US">');
    expect(html).toContain('Welcome to PostPony');
  });
});
