// app-handler.spec.ts
import { getCookie } from 'hono/cookie';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { AppError } from './lib/errors';

vi.mock('hono/cookie', () => ({
  getCookie: vi.fn(() => undefined),
  setCookie: vi.fn(),
}));

const mockContext = {
  req: {
    param: (name: string) => undefined,
    query: (name: string) => undefined,
    header: (name: string) => undefined,
    cookie: (name: string) => undefined,
  },
} as any; // Mocked Context object

describe('App.requireParam', () => {
  const isPartial = false;

  const createApp = (mockedContext: any) => new App(isPartial, mockedContext);

  beforeEach(() => {
    mockContext.req.param = (name: string) => undefined;
    mockContext.req.query = (name: string) => undefined;
    mockContext.req.header = (name: string) => undefined;
    mockContext.req.cookie = (name: string) => undefined;
    vi.mocked(getCookie)
      .mockReset();
    vi.mocked(getCookie)
      .mockReturnValue(undefined);
  });

  it('should return the parameter value when it exists', () => {
    mockContext.req.param = (name: string) => 'value';
    const app = createApp(mockContext);

    const result = app.requireParam('testParam');

    expect(result)
      .toBe('value');
  });

  it('should transform the parameter value when a transform function is provided', () => {
    mockContext.req.param = (name: string) => '123';
    const app = createApp(mockContext);

    const result = app.requireParam('testParam', (value) => Number(value));

    expect(result)
      .toBe(123);
    expect(typeof result)
      .toBe('number');
  });

  it('should throw a AppError if the parameter is missing', () => {
    mockContext.req.param = (name: string) => undefined;
    const app = createApp(mockContext);

    expect(() => app.requireParam('missingParam'))
      .toThrowError(new AppError('Missing required parameter: missingParam'));
  });

  describe('Localization', () => {
    it('should detect locale from lang query parameter', () => {
      mockContext.req.query = (name: string) => name === 'lang' ? 'de' : undefined;
      const app = createApp(mockContext);
      expect(app.locale)
        .toBe('de');
    });

    it('should prioritize query parameter over cookie', () => {
      mockContext.req.query = (name: string) => name === 'lang' ? 'de' : undefined;
      vi.mocked(getCookie)
        .mockReturnValueOnce('en');
      const app = createApp(mockContext);
      expect(app.locale)
        .toBe('de');
    });

    it('should detect de locale from Accept-Language header', () => {
      mockContext.req.header = (name: string) => name === 'Accept-Language' ? 'de-DE,de;q=0.9,en;q=0.8' : undefined;
      const app = createApp(mockContext);
      expect(app.locale)
        .toBe('de');
    });

    it('should default to en locale if Accept-Language header is missing', () => {
      mockContext.req.header = (name: string) => undefined;
      const app = createApp(mockContext);
      expect(app.locale)
        .toBe('en');
    });

    it('should translate keys correctly', () => {
      mockContext.req.header = (name: string) => 'en';
      vi.mocked(getCookie)
        .mockReturnValue(undefined);
      const appEn = createApp(mockContext);
      expect(appEn.t('welcome'))
        .toBe('Welcome to the Game Postponer');

      mockContext.req.header = (name: string) => 'de';
      vi.mocked(getCookie)
        .mockReturnValue(undefined);
      const appDe = createApp(mockContext);
      expect(appDe.t('welcome'))
        .toBe('Willkommen beim Spiel-Verschieber');
    });

    it('should prioritize cookie over Accept-Language header', () => {
      mockContext.req.header = (name: string) => name === 'Accept-Language' ? 'de-DE' : undefined;
      vi.mocked(getCookie)
        .mockReturnValueOnce('en');
      const app = createApp(mockContext);
      expect(app.locale)
        .toBe('en');
    });

    it('should handle parameters in translations', () => {
      mockContext.req.header = (name: string) => 'en';
      const app = createApp(mockContext);
      expect(app.t('missing_param', {name: 'foo'}))
        .toBe('Missing required parameter: foo');
    });
  });

});
