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
  initOccupancyTooltips,
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

describe('initOccupancyTooltips', () => {
  let host;
  let trigger;
  let tooltip;
  let outside;
  let cleanup;

  beforeEach(() => {
    host = document.createElement('div');
    host.className = 'venue-occupancy';
    host.innerHTML = '<button type="button" data-occupancy-trigger="true">1 other games at this venue</button>'
      + '<div id="occupancy-tooltip-pd-1" role="tooltip" class="occupancy-tooltip">8:15 PM vs Port</div>';
    document.body.appendChild(host);
    trigger = host.querySelector('[data-occupancy-trigger]');
    tooltip = host.querySelector('.occupancy-tooltip');
    outside = document.createElement('div');
    document.body.appendChild(outside);
    initOccupancyTooltips();
    cleanup = () => {
      document.body.removeChild(host);
      document.body.removeChild(outside);
    };
  });

  afterEach(() => cleanup());

  it('shows the tooltip on pointerover of the trigger', () => {
    trigger.dispatchEvent(new MouseEvent('pointerover', {bubbles: true}));
    expect(host.classList.contains('is-open')).toBe(true);
  });

  it('keeps the tooltip open when the pointer moves from trigger to tooltip', () => {
    trigger.dispatchEvent(new MouseEvent('pointerover', {bubbles: true}));
    trigger.dispatchEvent(new MouseEvent('pointerout', {bubbles: true, relatedTarget: tooltip}));
    expect(host.classList.contains('is-open')).toBe(true);
  });

  it('dismisses the tooltip when the pointer leaves the host', () => {
    trigger.dispatchEvent(new MouseEvent('pointerover', {bubbles: true}));
    trigger.dispatchEvent(new MouseEvent('pointerout', {bubbles: true, relatedTarget: outside}));
    expect(host.classList.contains('is-open')).toBe(false);
  });

  it('shows the tooltip on keyboard focus and dismisses on focus loss', () => {
    trigger.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    expect(host.classList.contains('is-open')).toBe(true);
    trigger.dispatchEvent(new FocusEvent('focusout', {bubbles: true, relatedTarget: outside}));
    expect(host.classList.contains('is-open')).toBe(false);
  });

  it('shows the tooltip on tap (click) and dismisses when clicking outside', () => {
    trigger.click();
    expect(host.classList.contains('is-open')).toBe(true);
    outside.click();
    expect(host.classList.contains('is-open')).toBe(false);
  });

  it('keeps the tooltip open when clicking inside the host', () => {
    trigger.click();
    tooltip.click();
    expect(host.classList.contains('is-open')).toBe(true);
  });

  it('dismisses on Escape and returns focus to the trigger', () => {
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    expect(host.classList.contains('is-open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('works for a host injected after initialization', () => {
    const lateHost = document.createElement('div');
    lateHost.className = 'venue-occupancy';
    lateHost.innerHTML = '<button type="button" data-occupancy-trigger="true">late</button>'
      + '<div role="tooltip" class="occupancy-tooltip">late tooltip</div>';
    document.body.appendChild(lateHost);

    lateHost.querySelector('button')
      .dispatchEvent(new MouseEvent('pointerover', {bubbles: true}));
    expect(lateHost.classList.contains('is-open')).toBe(true);

    document.body.removeChild(lateHost);
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

describe('initProposedDateTimePicker with a recording AirDatepicker fake', () => {
  const fakeInstances = [];

  class FakeAirDatepicker {
    constructor(input, options) {
      this.input = input;
      this.opts = options;
      this.$datepicker = document.createElement('div');
      this.shows = 0;
      this.destroyed = false;
      fakeInstances.push(this);
    }

    destroy() {
      this.destroyed = true;
    }

    show() {
      this.shows += 1;
    }
  }

  function installPickerDom() {
    const input = document.createElement('input');
    input.id = 'proposedDateTime';
    const button = document.createElement('button');
    button.id = 'proposedDateTimePicker';
    document.body.appendChild(input);
    document.body.appendChild(button);
    return {input, button};
  }

  let realAirDatepicker;
  let realLocale;

  beforeEach(() => {
    realAirDatepicker = window.AirDatepicker;
    realLocale = window.AirDatepickerLocale;
    window.AirDatepicker = FakeAirDatepicker;
    window.AirDatepickerLocale = {
      'en-US': {dateFormat: 'MM/dd/yyyy', timeFormat: 'hh:mm aa', hours: 'Hours', minutes: 'Minutes'},
    };
    document.documentElement.lang = 'en-US';
    fakeInstances.length = 0;
  });

  afterEach(() => {
    window.AirDatepicker = realAirDatepicker;
    window.AirDatepickerLocale = realLocale;
    document.body.innerHTML = '';
  });

  it('steps minutes in 15-minute increments and does not override the 1-hour hour step', () => {
    installPickerDom();
    initProposedDateTimePicker();
    expect(fakeInstances).toHaveLength(1);
    expect(fakeInstances[0].opts.minutesStep).toBe(15);
    expect(fakeInstances[0].opts.hoursStep).toBeUndefined();
  });

  it('binds the input and opens the picker only via the calendar button', () => {
    const {button} = installPickerDom();
    initProposedDateTimePicker();
    expect(fakeInstances).toHaveLength(1);
    expect(fakeInstances[0].input.id).toBe('proposedDateTime');
    expect(fakeInstances[0].shows).toBe(0);
    button.click();
    expect(fakeInstances[0].shows).toBe(1);
  });

  it('destroys the previous instance and rebinds on re-init (HTMX swap)', () => {
    installPickerDom();
    initProposedDateTimePicker();
    initProposedDateTimePicker();
    expect(fakeInstances).toHaveLength(2);
    expect(fakeInstances[0].destroyed).toBe(true);
    document.getElementById('proposedDateTimePicker').click();
    expect(fakeInstances[0].shows).toBe(0);
    expect(fakeInstances[1].shows).toBe(1);
  });
});
