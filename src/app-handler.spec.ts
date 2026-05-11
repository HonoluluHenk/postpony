// app-handler.spec.ts
import { describe, expect, it } from 'vitest';
import { App } from './app';
import { AppError } from './lib/errors';

const mockContext = {
  req: {
    param: (name: string) => undefined,
    header: (name: string) => undefined,
  },
} as any; // Mocked Context object

describe('App.requireParam', () => {
  const isPartial = false;

  const createApp = (mockedContext: any) => new App(isPartial, mockedContext);

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
      const appEn = createApp(mockContext);
      expect(appEn.t('welcome'))
        .toBe('Welcome to the Game Re-scheduler');

      mockContext.req.header = (name: string) => 'de';
      const appDe = createApp(mockContext);
      expect(appDe.t('welcome'))
        .toBe('Willkommen beim Spiel-Umplaner');
    });

    it('should handle parameters in translations', () => {
      mockContext.req.header = (name: string) => 'en';
      const app = createApp(mockContext);
      expect(app.t('missing_param', {name: 'foo'}))
        .toBe('Missing required parameter: foo');
    });
  });

});
