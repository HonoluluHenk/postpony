import { describe, expect, test } from 'vitest';
import { createApp } from './lib/__test-utils__/create-app';
import { InternalError } from './lib/errors';

describe('App request/response seam', () => {
  test('query delegates to the request query; an absent key is undefined', () => {
    const app = createApp({queries: {sort: 'availability'}});

    expect(app.query('sort'))
      .toBe('availability');
    expect(app.query('missing'))
      .toBeUndefined();
  });

  test('header delegates to the request headers', () => {
    const app = createApp({headers: {'HX-Request': 'true'}});

    expect(app.header('HX-Request'))
      .toBe('true');
  });

  test('currentUrl prefers HX-Current-URL and falls back to the request URL', () => {
    const htmx = createApp({
      headers: {'HX-Current-URL': 'https://game-scheduler.localhost:3000/edit/1?sort=availability'},
    });
    expect(htmx.currentUrl())
      .toBe('https://game-scheduler.localhost:3000/edit/1?sort=availability');

    const plain = createApp({url: 'https://game-scheduler.localhost:3000/edit/1'});
    expect(plain.currentUrl())
      .toBe('https://game-scheduler.localhost:3000/edit/1');
  });

  test('html and text build responses, honouring the status', async () => {
    const app = createApp();

    const html = app.html('<p>bad</p>', {status: 400});
    expect(html.status)
      .toBe(400);
    await expect(html.text())
      .resolves
      .toBe('<p>bad</p>');

    const text = app.text('', 200);
    expect(text.status)
      .toBe(200);
  });

  test('redirect builds a 302 with the Location header', () => {
    const app = createApp();

    const response = app.redirect('/edit/1');

    expect(response.status)
      .toBe(302);
    expect(response.headers.get('Location'))
      .toBe('/edit/1');
  });

  test('setHeader is applied to the next response', () => {
    const app = createApp();

    app.setHeader('HX-Redirect', '/edit/1');

    expect(app.text('', 200).headers.get('HX-Redirect'))
      .toBe('/edit/1');
  });

  test('body delegates to the request body parser', async () => {
    const app = createApp({body: {teamName: 'Thun'}});

    await expect(app.body())
      .resolves
      .toMatchObject({teamName: 'Thun'});
  });

  test('internal throws an InternalError with a localized default message', () => {
    const app = createApp();

    expect(() => app.internal())
      .toThrow(new InternalError('Internal Server Error'));
  });
});
