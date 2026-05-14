// app-handler.spec.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { AppError } from './lib/errors';

const mockContext = {
  get: vi.fn(),
  req: {
    param: (name: string) => undefined,
    query: (name: string) => undefined,
    header: (name: string) => undefined,
  },
} as any; // Mocked Context object

describe('App.requireParam', () => {
  const isPartial = false;

  const createApp = (mockedContext: any) => new App(isPartial, mockedContext);

  beforeEach(() => {
    vi.resetAllMocks();
    mockContext.req.param = (name: string) => undefined;
    mockContext.req.query = (name: string) => undefined;
    mockContext.req.header = (name: string) => undefined;
    mockContext.get.mockReturnValue('en');
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
    it('should use locale from context', () => {
      mockContext.get.mockReturnValue('de');
      const app = createApp(mockContext);
      expect(app.locale)
        .toBe('de');
      expect(mockContext.get)
        .toHaveBeenCalledWith('locale');
    });

    it('should translate keys correctly', () => {
      mockContext.get.mockReturnValue('en');
      const appEn = createApp(mockContext);
      expect(appEn.t('welcome'))
        .toBe('Welcome to PostPony');

      mockContext.get.mockReturnValue('de');
      const appDe = createApp(mockContext);
      expect(appDe.t('welcome'))
        .toBe('Willkommen bei PostPony');
    });

    it('should handle parameters in translations', () => {
      mockContext.get.mockReturnValue('en');
      const app = createApp(mockContext);
      expect(app.t('missing_param', {name: 'foo'}))
        .toBe('Missing required parameter: foo');
    });
  });

});
