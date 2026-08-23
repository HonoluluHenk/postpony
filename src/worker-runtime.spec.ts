import { afterEach, describe, expect, it } from 'vitest';
import { applyWorkerEnv } from './worker-runtime';

describe('applyWorkerEnv', () => {
  const original = {...process.env};

  afterEach(() => {
    process.env = {...original};
  });

  it('merges vars into process.env without dropping existing values', () => {
    process.env['PRE_EXISTING'] = 'yes';
    applyWorkerEnv({APP_TEMPLATE_SOURCE: 'memory'});
    expect(process.env['PRE_EXISTING']).toBe('yes');
    expect(process.env['APP_TEMPLATE_SOURCE']).toBe('memory');
  });
});
