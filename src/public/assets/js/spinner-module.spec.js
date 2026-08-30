import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {Spinner, shouldShowSpinner, isHtmxDriven} from './spinner-module.js';

describe('Spinner', () => {
  let spinnerEl;

  beforeEach(() => {
    spinnerEl = document.createElement('div');
    spinnerEl.id = 'global-spinner';
    spinnerEl.setAttribute('role', 'status');
    spinnerEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(spinnerEl);
  });

  afterEach(() => {
    document.body.removeChild(spinnerEl);
    document.body.classList.remove('is-loading');
  });

  describe('show', () => {
    it('adds is-active class', () => {
      const spinner = new Spinner();
      spinner.show();
      expect(spinnerEl.classList.contains('is-active')).toBe(true);
    });

    it('sets aria-hidden to false', () => {
      const spinner = new Spinner();
      spinner.show();
      expect(spinnerEl.getAttribute('aria-hidden')).toBe('false');
    });

    it('sets aria-busy to true', () => {
      const spinner = new Spinner();
      spinner.show();
      expect(spinnerEl.getAttribute('aria-busy')).toBe('true');
    });

    it('adds is-loading class to body', () => {
      const spinner = new Spinner();
      spinner.show();
      expect(document.body.classList.contains('is-loading')).toBe(true);
    });
  });

  describe('hide', () => {
    it('removes is-active class', () => {
      const spinner = new Spinner();
      spinner.show();
      spinner.hide();
      expect(spinnerEl.classList.contains('is-active')).toBe(false);
    });

    it('sets aria-hidden to true', () => {
      const spinner = new Spinner();
      spinner.show();
      spinner.hide();
      expect(spinnerEl.getAttribute('aria-hidden')).toBe('true');
    });

    it('removes aria-busy attribute (not sets to false)', () => {
      const spinner = new Spinner();
      spinner.show();
      spinner.hide();
      expect(spinnerEl.hasAttribute('aria-busy')).toBe(false);
    });

    it('removes is-loading class from body', () => {
      const spinner = new Spinner();
      spinner.show();
      spinner.hide();
      expect(document.body.classList.contains('is-loading')).toBe(false);
    });
  });
});

describe('shouldShowSpinner', () => {
  it('returns true for a plain button', () => {
    const el = document.createElement('button');
    expect(shouldShowSpinner(el)).toBe(true);
  });

  it('returns true for an anchor with class button and real href', () => {
    const el = document.createElement('a');
    el.className = 'button';
    el.setAttribute('href', '/some-page');
    expect(shouldShowSpinner(el)).toBe(true);
  });

  it('returns false when data-no-spinner is set', () => {
    const el = document.createElement('button');
    el.setAttribute('data-no-spinner', '');
    expect(shouldShowSpinner(el)).toBe(false);
  });

  it('returns false for a type=button (client-only action, no navigation)', () => {
    const el = document.createElement('button');
    el.setAttribute('type', 'button');
    expect(shouldShowSpinner(el)).toBe(false);
  });

  it('returns false for a submit button inside an htmx form (no double spinner)', () => {
    const form = document.createElement('form');
    form.setAttribute('hx-post', '/something');
    form.setAttribute('hx-target', '#list');
    const btn = document.createElement('button');
    btn.setAttribute('type', 'submit');
    form.appendChild(btn);
    document.body.appendChild(form);
    expect(shouldShowSpinner(btn)).toBe(false);
    document.body.removeChild(form);
  });

  it('returns true for a submit button in a plain form (full-page submit)', () => {
    const form = document.createElement('form');
    const btn = document.createElement('button');
    btn.setAttribute('type', 'submit');
    form.appendChild(btn);
    document.body.appendChild(form);
    expect(shouldShowSpinner(btn)).toBe(true);
    document.body.removeChild(form);
  });

  it('returns false when hx-get is set', () => {
    const el = document.createElement('button');
    el.setAttribute('hx-get', '/something');
    expect(shouldShowSpinner(el)).toBe(false);
  });

  it('returns false when hx-post is set', () => {
    const el = document.createElement('button');
    el.setAttribute('hx-post', '/something');
    expect(shouldShowSpinner(el)).toBe(false);
  });

  it('returns false when hx-put is set', () => {
    const el = document.createElement('button');
    el.setAttribute('hx-put', '/something');
    expect(shouldShowSpinner(el)).toBe(false);
  });

  it('returns false when hx-delete is set', () => {
    const el = document.createElement('button');
    el.setAttribute('hx-delete', '/something');
    expect(shouldShowSpinner(el)).toBe(false);
  });

  it('returns false when hx-patch is set', () => {
    const el = document.createElement('button');
    el.setAttribute('hx-patch', '/something');
    expect(shouldShowSpinner(el)).toBe(false);
  });

  it('returns false for an anchor with fragment-only href', () => {
    const el = document.createElement('a');
    el.setAttribute('href', '#section');
    expect(shouldShowSpinner(el)).toBe(false);
  });

  it('returns false for an anchor with no href', () => {
    const el = document.createElement('a');
    expect(shouldShowSpinner(el)).toBe(false);
  });

  it('returns false for an anchor with target _blank', () => {
    const el = document.createElement('a');
    el.setAttribute('href', '/some-page');
    el.setAttribute('target', '_blank');
    expect(shouldShowSpinner(el)).toBe(false);
  });
});

describe('isHtmxDriven', () => {
  it('returns true for hx-get', () => {
    const el = document.createElement('div');
    el.setAttribute('hx-get', '/something');
    expect(isHtmxDriven(el)).toBe(true);
  });

  it('returns true for hx-post', () => {
    const el = document.createElement('div');
    el.setAttribute('hx-post', '/something');
    expect(isHtmxDriven(el)).toBe(true);
  });

  it('returns true for hx-put', () => {
    const el = document.createElement('div');
    el.setAttribute('hx-put', '/something');
    expect(isHtmxDriven(el)).toBe(true);
  });

  it('returns true for hx-delete', () => {
    const el = document.createElement('div');
    el.setAttribute('hx-delete', '/something');
    expect(isHtmxDriven(el)).toBe(true);
  });

  it('returns true for hx-patch', () => {
    const el = document.createElement('div');
    el.setAttribute('hx-patch', '/something');
    expect(isHtmxDriven(el)).toBe(true);
  });

  it('returns false when no hx attributes are present', () => {
    const el = document.createElement('div');
    expect(isHtmxDriven(el)).toBe(false);
  });
});

describe('pageshow', () => {
  let spinnerEl;

  beforeEach(() => {
    spinnerEl = document.createElement('div');
    spinnerEl.id = 'global-spinner';
    spinnerEl.setAttribute('role', 'status');
    spinnerEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(spinnerEl);
  });

  afterEach(() => {
    document.body.removeChild(spinnerEl);
    document.body.classList.remove('is-loading');
  });

  it('hides spinner on pageshow event', () => {
    const spinner = new Spinner();
    spinner.show();
    expect(spinnerEl.classList.contains('is-active')).toBe(true);

    window.dispatchEvent(new Event('pageshow'));

    expect(spinnerEl.classList.contains('is-active')).toBe(false);
    expect(spinnerEl.getAttribute('aria-hidden')).toBe('true');
    expect(spinnerEl.hasAttribute('aria-busy')).toBe(false);
    expect(document.body.classList.contains('is-loading')).toBe(false);
  });
});

describe('submit listener', () => {
  let spinnerEl;

  beforeEach(() => {
    spinnerEl = document.createElement('div');
    spinnerEl.id = 'global-spinner';
    spinnerEl.setAttribute('role', 'status');
    spinnerEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(spinnerEl);
  });

  afterEach(() => {
    document.body.removeChild(spinnerEl);
    document.body.classList.remove('is-loading');
  });

  it('shows spinner for a plain form submit', () => {
    new Spinner();
    const form = document.createElement('form');
    document.body.appendChild(form);

    form.addEventListener('submit', (e) => e.preventDefault(), {capture: true, once: true});

    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    expect(spinnerEl.classList.contains('is-active')).toBe(true);

    document.body.removeChild(form);
  });

  it('does not show spinner for an HTMX-driven form', () => {
    new Spinner();
    const form = document.createElement('form');
    form.setAttribute('hx-post', '/something');
    document.body.appendChild(form);

    form.addEventListener('submit', (e) => e.preventDefault(), {capture: true, once: true});

    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    expect(spinnerEl.classList.contains('is-active')).toBe(false);

    document.body.removeChild(form);
  });

  it('does not show spinner for a form with data-no-spinner', () => {
    new Spinner();
    const form = document.createElement('form');
    form.setAttribute('data-no-spinner', '');
    document.body.appendChild(form);

    form.addEventListener('submit', (e) => e.preventDefault(), {capture: true, once: true});

    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    expect(spinnerEl.classList.contains('is-active')).toBe(false);

    document.body.removeChild(form);
  });
});

describe('click listener', () => {
  let spinnerEl;

  beforeEach(() => {
    spinnerEl = document.createElement('div');
    spinnerEl.id = 'global-spinner';
    spinnerEl.setAttribute('role', 'status');
    spinnerEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(spinnerEl);
  });

  afterEach(() => {
    document.body.removeChild(spinnerEl);
    document.body.classList.remove('is-loading');
  });

  it('shows spinner for a button click', () => {
    new Spinner();
    const btn = document.createElement('button');
    document.body.appendChild(btn);

    btn.addEventListener('click', (e) => e.preventDefault(), {capture: true, once: true});

    btn.click();
    expect(spinnerEl.classList.contains('is-active')).toBe(true);

    document.body.removeChild(btn);
  });

  it('does not show spinner for an HTMX-driven button', () => {
    new Spinner();
    const btn = document.createElement('button');
    btn.setAttribute('hx-get', '/something');
    document.body.appendChild(btn);

    btn.addEventListener('click', (e) => e.preventDefault(), {capture: true, once: true});

    btn.click();
    expect(spinnerEl.classList.contains('is-active')).toBe(false);

    document.body.removeChild(btn);
  });
});
