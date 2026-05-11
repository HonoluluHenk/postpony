// app-handler.spec.ts
import { describe, expect, it } from 'vitest';
import { App } from './app';
import { AppFailure } from './app-failure';

const mockContext = {
  req: {
    param: (name: string) => undefined,
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

  it('should throw an AppFailure if the parameter is missing', () => {
    mockContext.req.param = (name: string) => undefined;
    const app = createApp(mockContext);

    expect(() => app.requireParam('missingParam'))
      .toThrowError(new AppFailure('Missing required parameter: missingParam'));
  });

});
