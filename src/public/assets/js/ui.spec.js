import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {
  shouldSwapErrorBody,
  decideLanguageRedirect,
  initHtmx,
  initTheme,
  initProposedDateTimePicker,
  initClipboard,
  initDeleteDialogs,
  initFocusManagement,
} from './ui.js';

describe('shouldSwapErrorBody', () => {
  it('returns true for body with non-out-of-band content', () => {
    expect(shouldSwapErrorBody('<div>Error message</div>')).toBe(true);
  });

  it('returns false for body with out-of-band-only content', () => {
    expect(shouldSwapErrorBody('<div hx-swap-oob="true">Some OOB</div>')).toBe(false);
  });

  it('returns true for empty string', () => {
    expect(shouldSwapErrorBody('')).toBe(true);
  });

  it('returns true for whitespace-only body', () => {
    expect(shouldSwapErrorBody('   ')).toBe(true);
  });

  it('returns true for body with both OOB and non-OOB content', () => {
    const html = '<div hx-swap-oob="true">OOB</div><div>Error</div>';
    expect(shouldSwapErrorBody(html)).toBe(true);
  });
});

describe('decideLanguageRedirect', () => {
  it('returns null when query string already has lang=', () => {
    expect(decideLanguageRedirect('lang=de-CH', '/page', 'en-US', 'de-CH')).toBe(null);
  });

  it('returns null when stored value matches document lang', () => {
    expect(decideLanguageRedirect('', '/page', 'de-CH', 'de-CH')).toBe(null);
  });

  it('returns redirect URL when stored value differs', () => {
    expect(decideLanguageRedirect('', '/page', 'en-US', 'de-CH')).toBe('/page?lang=de-CH');
  });

  it('returns null when no stored value', () => {
    expect(decideLanguageRedirect('', '/page', 'en-US', null)).toBe(null);
  });
});

describe('initDeleteDialogs', () => {
  let cleanup;

  beforeEach(() => {
    const dialog = document.createElement('dialog');
    dialog.id = 'test-dialog';
    document.body.appendChild(dialog);

    const trigger = document.createElement('button');
    trigger.setAttribute('data-open-dialog', 'test-dialog');
    document.body.appendChild(trigger);

    initDeleteDialogs();
    cleanup = () => {
      document.body.removeChild(dialog);
      document.body.removeChild(trigger);
    };
  });

  afterEach(() => cleanup());

  it('opens dialog on trigger click', () => {
    const dialog = document.getElementById('test-dialog');
    document.querySelector('[data-open-dialog]').click();
    expect(dialog.open).toBe(true);
    dialog.close();
  });

  it('closes dialog on dismiss click', () => {
    const dialog = document.getElementById('test-dialog');
    dialog.showModal();

    const dismiss = document.createElement('button');
    dismiss.setAttribute('data-dismiss-dialog', '');
    dialog.appendChild(dismiss);

    dismiss.click();
    expect(dialog.open).toBe(false);
  });

  it('works for a trigger injected after initialization', () => {
    const dialog = document.getElementById('test-dialog');

    const newTrigger = document.createElement('button');
    newTrigger.setAttribute('data-open-dialog', 'test-dialog');
    document.body.appendChild(newTrigger);

    newTrigger.click();
    expect(dialog.open).toBe(true);
    dialog.close();

    document.body.removeChild(newTrigger);
  });
});

describe('initClipboard', () => {
  let descriptor;

  beforeEach(() => {
    descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      value: {writeText: vi.fn().mockResolvedValue(undefined)},
      configurable: true,
    });
    vi.useFakeTimers();
    initClipboard();
  });

  afterEach(() => {
    if (descriptor) {
      Object.defineProperty(navigator, 'clipboard', descriptor);
    } else {
      // clipboard wasn't on navigator originally — delete our mock
      delete navigator.clipboard;
    }
    vi.useRealTimers();
  });

  it('writes the dataset value to clipboard', async () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-copy', 'test-value');
    const icon = document.createElement('i');
    icon.textContent = 'content_copy';
    btn.appendChild(icon);
    document.body.appendChild(btn);

    btn.click();
    expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-value');

    expect(icon.textContent).toBe('check');

    vi.advanceTimersByTime(2000);
    expect(icon.textContent).toBe('content_copy');

    document.body.removeChild(btn);
  });
});

describe('initFocusManagement', () => {
  let cleanup;

  beforeEach(() => {
    initFocusManagement();
    cleanup = () => {
    };
  });

  afterEach(() => cleanup());

  it('focuses the first heading in #main-content after settle', () => {
    const main = document.createElement('div');
    main.id = 'main-content';
    const h2 = document.createElement('h2');
    h2.textContent = 'Section Title';
    main.appendChild(h2);
    document.body.appendChild(main);
    cleanup = () => document.body.removeChild(main);

    main.dispatchEvent(new CustomEvent('htmx:afterSettle', {
      bubbles: true,
      detail: {target: main},
    }));

    expect(h2.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(h2);
  });

  it('focuses the first heading in #team-management after settle', () => {
    const el = document.createElement('div');
    el.id = 'team-management';
    const h3 = document.createElement('h3');
    h3.textContent = 'Teams';
    el.appendChild(h3);
    document.body.appendChild(el);
    cleanup = () => document.body.removeChild(el);

    el.dispatchEvent(new CustomEvent('htmx:afterSettle', {
      bubbles: true,
      detail: {target: el},
    }));

    expect(h3.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(h3);
  });

  it('focuses the first heading in #venue-management after settle', () => {
    const el = document.createElement('div');
    el.id = 'venue-management';
    const h4 = document.createElement('h4');
    h4.textContent = 'Venues';
    el.appendChild(h4);
    document.body.appendChild(el);
    cleanup = () => document.body.removeChild(el);

    el.dispatchEvent(new CustomEvent('htmx:afterSettle', {
      bubbles: true,
      detail: {target: el},
    }));

    expect(h4.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(h4);
  });

  it('focuses the first heading in #proposed-dates-management after settle', () => {
    const el = document.createElement('div');
    el.id = 'proposed-dates-management';
    const h2 = document.createElement('h2');
    h2.textContent = 'Dates';
    el.appendChild(h2);
    document.body.appendChild(el);
    cleanup = () => document.body.removeChild(el);

    el.dispatchEvent(new CustomEvent('htmx:afterSettle', {
      bubbles: true,
      detail: {target: el},
    }));

    expect(h2.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(h2);
  });

  it('does not steal focus htmx restored to a control inside the section', () => {
    const el = document.createElement('div');
    el.id = 'proposed-dates-management';
    const h3 = document.createElement('h3');
    h3.textContent = 'Dates';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'votable-abc';
    el.appendChild(h3);
    el.appendChild(checkbox);
    document.body.appendChild(el);
    cleanup = () => document.body.removeChild(el);

    checkbox.focus();

    el.dispatchEvent(new CustomEvent('htmx:afterSettle', {
      bubbles: true,
      detail: {target: el},
    }));

    expect(document.activeElement).toBe(checkbox);
    expect(h3.getAttribute('tabindex')).toBe(null);
  });

  it('ignores non-element event targets without throwing', () => {
    const event = new CustomEvent('htmx:afterSettle', {
      bubbles: true,
      detail: {target: document.createTextNode('text')},
    });
    expect(() => document.dispatchEvent(event)).not.toThrow();
  });
});

describe('vendor init no-ops', () => {
  it('initTheme is a no-op when ui is absent', () => {
    expect(() => initTheme()).not.toThrow();
  });

  it('initProposedDateTimePicker is a no-op when AirDatepicker is absent', () => {
    expect(() => initProposedDateTimePicker()).not.toThrow();
  });

  it('initHtmx is a no-op when htmx is absent', () => {
    const mockSpinner = {
      show() {
      }, hide() {
      }
    };
    expect(() => initHtmx(mockSpinner)).not.toThrow();
  });
});
