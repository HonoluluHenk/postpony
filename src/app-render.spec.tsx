import { describe, expect, it, vi } from 'vitest';
import type { JSX } from 'hono/jsx/jsx-runtime';
import { App, type ViewContext } from './app';

function createMockContext(locale = 'en-US', isPartial = false): any {
  return {
    get: vi.fn().mockReturnValue(locale),
    req: {
      param: vi.fn(),
      query: vi.fn(),
      header: vi.fn().mockImplementation((h: string) => (h === 'HX-Request' && isPartial ? 'true' : undefined)),
      url: 'http://localhost:3000/test',
    },
  };
}

describe('App.prototype.render JSX seam', () => {
  it('returns synchronous string output from a JSX component', () => {
    const app = App.create(createMockContext());

    function TestComponent(): JSX.Element {
      return <div class="test-box">Hello World</div>;
    }

    const output = app.render(<TestComponent />);
    expect(typeof output).toBe('string');
    expect(output).toBe('<div class="test-box">Hello World</div>');
  });

  it('exposes ambient view values via app.view and allows spreading into component props', () => {
    const app = App.create(createMockContext('de-CH', true));

    function ViewConsumer(props: ViewContext & { extra: string }): JSX.Element {
      return (
        <section data-partial={String(props.isPartial)} data-locale={props.locale} data-format={props.inputFormat}>
          <h1>{props.t('welcome')}</h1>
          <span>{props.baseUrl}</span>
          <span>{props.extra}</span>
          <select>
            {props.languageOptions.map((opt) => (
              <option value={opt.code}>{opt.label}</option>
            ))}
          </select>
        </section>
      );
    }

    const output = app.render(<ViewConsumer {...app.view} extra="custom-extra" />);

    expect(output).toContain('data-partial="true"');
    expect(output).toContain('data-locale="de-CH"');
    expect(output).toContain('data-format="dd.MM.yyyy HH:mm"');
    expect(output).toContain('<h1>Willkommen bei PostPony</h1>');
    expect(output).toContain('<span>http://localhost:3000</span>');
    expect(output).toContain('<span>custom-extra</span>');
    expect(output).toContain('<option value="de-CH">Deutsch</option>');
    expect(output).toContain('<option value="en-US">English</option>');
  });

  it('renders user-supplied markup escaped', () => {
    const app = App.create(createMockContext());

    function UserGreeting(props: { name: string }): JSX.Element {
      return <p>Hello, {props.name}!</p>;
    }

    const maliciousName = '<script>alert("xss")</script> & <b>bold</b>';
    const output = app.render(<UserGreeting name={maliciousName} />);

    expect(output).toBe('<p>Hello, &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &lt;b&gt;bold&lt;/b&gt;!</p>');
    expect(output).not.toContain('<script>');
    expect(output).not.toContain('<b>');
  });
});
