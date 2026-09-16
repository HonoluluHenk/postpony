import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  decideLanguageRedirect,
  initClipboard,
  initDatePicker,
  initDeleteDialogs,
  initFocusManagement,
  initGeneratorDatePickers,
  initGeneratorTimePickers,
  initHtmx,
  initLanguage,
  initOccupancyTooltips,
  initProposedDateTimePicker,
  initRedesignDisclosures,
  initTheme,
  initVoteForm,
  shouldSwapErrorBody,
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

  it('announces the copied label in the status element and clears it after 2s', () => {
    const status = document.createElement('p');
    status.id = 'clipboard-status';
    document.body.appendChild(status);

    const btn = document.createElement('button');
    btn.setAttribute('data-copy', 'test-value');
    btn.setAttribute('data-copied-label', 'Copied to clipboard');
    document.body.appendChild(btn);

    btn.click();
    expect(status.textContent).toBe('Copied to clipboard');

    vi.advanceTimersByTime(2000);
    expect(status.textContent).toBe('');

    document.body.removeChild(status);
    document.body.removeChild(btn);
  });

  it('announces nothing when the button carries no copied label', () => {
    const status = document.createElement('p');
    status.id = 'clipboard-status';
    document.body.appendChild(status);

    const btn = document.createElement('button');
    btn.setAttribute('data-copy', 'test-value');
    document.body.appendChild(btn);

    btn.click();
    expect(status.textContent).toBe('');

    document.body.removeChild(status);
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

describe('initVoteForm', () => {
  let form;
  let submitSpy;
  let spinner;
  let disabledAtSubmit;
  let yesButton;
  let noButton;
  let ifNecessaryButton;
  let cleanup;

  function buildVoteForm() {
    const f = document.createElement('form');
    f.innerHTML = [
      '<fieldset class="vote-radio-group"><legend>date-1</legend>',
      '<label><input type="radio" name="vote-date-1" value="Yes"><span>Yes</span></label>',
      '<label><input type="radio" name="vote-date-1" value="IfNecessary"><span>if necessary</span></label>',
      '<label><input type="radio" name="vote-date-1" value="No"><span>No</span></label>',
      '</fieldset>',
      '<fieldset class="vote-radio-group"><legend>date-2</legend>',
      '<label><input type="radio" name="vote-date-2" value="Yes"><span>Yes</span></label>',
      '<label><input type="radio" name="vote-date-2" value="IfNecessary"><span>if necessary</span></label>',
      '<label><input type="radio" name="vote-date-2" value="No"><span>No</span></label>',
      '</fieldset>',
    ].join('');
    yesButton = document.createElement('button');
    yesButton.type = 'button';
    yesButton.setAttribute('data-set-all', 'Yes');
    noButton = document.createElement('button');
    noButton.type = 'button';
    noButton.setAttribute('data-set-all', 'No');
    ifNecessaryButton = document.createElement('button');
    ifNecessaryButton.type = 'button';
    ifNecessaryButton.setAttribute('data-set-all', 'IfNecessary');
    f.appendChild(yesButton);
    f.appendChild(noButton);
    f.appendChild(ifNecessaryButton);
    return f;
  }

  function valueByName(dateName, value) {
    return form.querySelector(`input[name="vote-${dateName}"][value="${value}"]`);
  }

  function selectedValues() {
    return Array.from(form.querySelectorAll('input[type="radio"]'))
      .filter((radio) => radio.checked)
      .map((radio) => radio.value)
      .sort();
  }

  function changeRadio(dateName, value) {
    const radio = valueByName(dateName, value);
    radio.checked = true;
    radio.dispatchEvent(new Event('change', {bubbles: true}));
  }

  // Simulates the full-page reload / bfcache restore that clears the in-flight
  // busy state.
  function reload() {
    window.dispatchEvent(new Event('pageshow'));
  }

  // Simulates the HTMX swap that replaces #vote-region after a save.
  function swap() {
    document.dispatchEvent(new CustomEvent('htmx:afterSwap', {
      bubbles: true,
      detail: {elt: {nodeType: 1, id: 'vote-region'}},
    }));
  }

  // Simulates a failed save request: HTMX fires afterRequest without a swap.
  function failRequest() {
    form.dispatchEvent(new CustomEvent('htmx:afterRequest', {bubbles: true}));
  }

  // Delegated on `document`, so wire it once; wiring per test would stack
  // listeners and multiply the submit spy.
  beforeAll(() => {
    spinner = {show: vi.fn()};
    initVoteForm(spinner);
  });

  beforeEach(() => {
    form = buildVoteForm();
    document.body.appendChild(form);
    sessionStorage.clear();
    submitSpy = vi.fn();
    disabledAtSubmit = null;
    vi.spyOn(form, 'requestSubmit').mockImplementation(() => {
      // HTMX captures the form values during requestSubmit(), so controls must
      // still be enabled at this point.
      disabledAtSubmit = valueByName('date-1', 'Yes').disabled;
      submitSpy();
    });
    spinner.show.mockClear();
    cleanup = () => form.remove();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('checks the matching radio in every date group and submits the form', () => {
    yesButton.click();
    expect(selectedValues()).toEqual(['Yes', 'Yes']);
    expect(submitSpy).toHaveBeenCalledTimes(1);
    reload();
    noButton.click();
    expect(selectedValues()).toEqual(['No', 'No']);
    expect(submitSpy).toHaveBeenCalledTimes(2);
    reload();
    ifNecessaryButton.click();
    expect(selectedValues()).toEqual(['IfNecessary', 'IfNecessary']);
    expect(submitSpy).toHaveBeenCalledTimes(3);
  });

  it('overwrites previously selected votes before submitting', () => {
    valueByName('date-1', 'Yes').checked = true;
    valueByName('date-2', 'IfNecessary').checked = true;

    noButton.click();

    expect(selectedValues()).toEqual(['No', 'No']);
    expect(valueByName('date-1', 'Yes').checked).toBe(false);
    expect(valueByName('date-2', 'IfNecessary').checked).toBe(false);
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it('marks the form busy, shows the spinner and disables controls after submit', () => {
    yesButton.click();

    expect(form.getAttribute('aria-busy')).toBe('true');
    expect(spinner.show).toHaveBeenCalledTimes(1);
    expect(disabledAtSubmit).toBe(false);
    expect(valueByName('date-1', 'Yes').disabled).toBe(true);
    expect(valueByName('date-2', 'Yes').disabled).toBe(true);
    expect(yesButton.disabled).toBe(true);
    expect(noButton.disabled).toBe(true);
    expect(ifNecessaryButton.disabled).toBe(true);
  });

  it('submits once after the debounce window when a vote radio changes', () => {
    vi.useFakeTimers();
    changeRadio('date-1', 'No');

    expect(submitSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(399);
    expect(submitSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it('submits once for two changes inside the debounce window', () => {
    vi.useFakeTimers();
    changeRadio('date-1', 'Yes');
    vi.advanceTimersByTime(200);
    changeRadio('date-2', 'No');

    // 400ms after the first change but only 200ms after the second: the timer
    // reset means nothing fires yet.
    vi.advanceTimersByTime(200);
    expect(submitSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending radio save when a set-all button is clicked', () => {
    vi.useFakeTimers();
    changeRadio('date-1', 'No');
    yesButton.click();

    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(selectedValues()).toEqual(['Yes', 'Yes']);
    vi.advanceTimersByTime(1000);
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores further set-all clicks while a save is pending', () => {
    yesButton.click();
    noButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(selectedValues()).toEqual(['Yes', 'Yes']);
  });

  it('ignores a radio change while a save is pending', () => {
    vi.useFakeTimers();
    yesButton.click();
    valueByName('date-1', 'No').dispatchEvent(new Event('change', {bubbles: true}));

    vi.advanceTimersByTime(1000);
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it('resets the busy state on pageshow so a back-navigation is not stuck', () => {
    yesButton.click();
    expect(form.getAttribute('aria-busy')).toBe('true');
    expect(yesButton.disabled).toBe(true);

    reload();

    expect(form.hasAttribute('aria-busy')).toBe(false);
    expect(yesButton.disabled).toBe(false);
    expect(valueByName('date-1', 'Yes').disabled).toBe(false);

    noButton.click();
    expect(submitSpy).toHaveBeenCalledTimes(2);
  });

  it('ignores changes to radios outside the vote rows', () => {
    const stray = document.createElement('input');
    stray.type = 'radio';
    stray.name = 'vote-stray';
    stray.value = 'Yes';
    form.appendChild(stray);

    stray.checked = true;
    stray.dispatchEvent(new Event('change', {bubbles: true}));

    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('ignores a set-all button carrying an unknown vote value', () => {
    const rogue = document.createElement('button');
    rogue.type = 'button';
    rogue.setAttribute('data-set-all', 'Maybe');
    form.appendChild(rogue);

    rogue.click();

    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('ignores vote controls that are not inside a form', () => {
    const orphanGroup = document.createElement('fieldset');
    orphanGroup.className = 'vote-radio-group';
    const orphanRadio = document.createElement('input');
    orphanRadio.type = 'radio';
    orphanRadio.name = 'vote-orphan';
    orphanRadio.value = 'Yes';
    orphanGroup.appendChild(orphanRadio);
    const orphanButton = document.createElement('button');
    orphanButton.type = 'button';
    orphanButton.setAttribute('data-set-all', 'Yes');
    document.body.appendChild(orphanGroup);
    document.body.appendChild(orphanButton);

    orphanButton.click();
    orphanRadio.checked = true;
    orphanRadio.dispatchEvent(new Event('change', {bubbles: true}));

    expect(submitSpy).not.toHaveBeenCalled();

    document.body.removeChild(orphanGroup);
    document.body.removeChild(orphanButton);
  });

  it('works for a set-all button injected after initialization', () => {
    const late = document.createElement('button');
    late.type = 'button';
    late.setAttribute('data-set-all', 'IfNecessary');
    form.appendChild(late);

    late.click();

    expect(selectedValues()).toEqual(['IfNecessary', 'IfNecessary']);
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it('remembers the changed radio (name + value) before submitting', () => {
    vi.useFakeTimers();
    changeRadio('date-1', 'No');
    vi.advanceTimersByTime(400);

    expect(JSON.parse(sessionStorage.getItem('postpony-vote-focus')))
      .toEqual({name: 'vote-date-1', value: 'No'});
  });

  it('remembers the set-all button value before submitting', () => {
    yesButton.click();

    expect(JSON.parse(sessionStorage.getItem('postpony-vote-focus')))
      .toEqual({value: 'Yes'});
  });

  it('remembers the last radio when two changes land inside the debounce window', () => {
    vi.useFakeTimers();
    changeRadio('date-1', 'Yes');
    changeRadio('date-2', 'No');
    vi.advanceTimersByTime(400);

    expect(JSON.parse(sessionStorage.getItem('postpony-vote-focus')))
      .toEqual({name: 'vote-date-2', value: 'No'});
  });

  it('restores focus to the changed radio after the swap without scrolling', () => {
    sessionStorage.setItem('postpony-vote-focus', JSON.stringify({name: 'vote-date-1', value: 'No'}));
    const radio = valueByName('date-1', 'No');
    const focusSpy = vi.spyOn(radio, 'focus');

    swap();

    expect(focusSpy).toHaveBeenCalledWith({preventScroll: true});
    expect(document.activeElement).toBe(radio);
    expect(sessionStorage.getItem('postpony-vote-focus')).toBe(null);
  });

  it('restores focus to the set-all button after the swap', () => {
    sessionStorage.setItem('postpony-vote-focus', JSON.stringify({value: 'No'}));
    const focusSpy = vi.spyOn(noButton, 'focus');

    swap();

    expect(focusSpy).toHaveBeenCalledWith({preventScroll: true});
    expect(document.activeElement).toBe(noButton);
    expect(sessionStorage.getItem('postpony-vote-focus')).toBe(null);
  });

  it('leaves focus untouched and does not throw when the remembered target is gone', () => {
    sessionStorage.setItem('postpony-vote-focus', JSON.stringify({name: 'vote-deleted', value: 'Yes'}));
    const before = document.activeElement;

    expect(() => swap()).not.toThrow();

    expect(document.activeElement).toBe(before);
    expect(sessionStorage.getItem('postpony-vote-focus')).toBe(null);
  });

  it('ignores a corrupt focus record without throwing', () => {
    sessionStorage.setItem('postpony-vote-focus', 'not-json');

    expect(() => swap()).not.toThrow();
    expect(sessionStorage.getItem('postpony-vote-focus')).toBe(null);
  });

  it('ignores a swap outside the vote region', () => {
    sessionStorage.setItem('postpony-vote-focus', JSON.stringify({name: 'vote-date-1', value: 'No'}));
    const radio = valueByName('date-1', 'No');
    const focusSpy = vi.spyOn(radio, 'focus');

    document.dispatchEvent(new CustomEvent('htmx:afterSwap', {
      bubbles: true,
      detail: {elt: {nodeType: 1, id: 'edit-grid'}},
    }));

    expect(focusSpy).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('postpony-vote-focus')).not.toBe(null);
  });

  it('resets the busy state when the save request fails without a swap', () => {
    yesButton.click();
    expect(form.getAttribute('aria-busy')).toBe('true');
    expect(yesButton.disabled).toBe(true);

    failRequest();

    expect(form.hasAttribute('aria-busy')).toBe(false);
    expect(yesButton.disabled).toBe(false);

    noButton.click();
    expect(submitSpy).toHaveBeenCalledTimes(2);
  });
});

describe('vendor init no-ops', () => {
  it('initTheme is a no-op when ui is absent', () => {
    expect(() => initTheme()).not.toThrow();
  });

  it('initProposedDateTimePicker is a no-op when AirDatepicker is absent', () => {
    expect(() => initProposedDateTimePicker()).not.toThrow();
  });

  it('initGeneratorTimePickers is a no-op when AirDatepicker is absent', () => {
    expect(() => initGeneratorTimePickers()).not.toThrow();
  });

  it('initGeneratorDatePickers is a no-op when AirDatepicker is absent', () => {
    expect(() => initGeneratorDatePickers()).not.toThrow();
  });

  it('initDatePicker is a no-op when AirDatepicker is absent', () => {
    const input = document.createElement('input');
    const button = document.createElement('button');
    expect(() => initDatePicker(input, button)).not.toThrow();
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

describe('initDatePicker with a recording AirDatepicker fake', () => {
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
    input.id = 'test-field';
    const button = document.createElement('button');
    button.id = 'test-field-picker';
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

  it('is a no-op when input is absent', () => {
    initDatePicker(null, document.createElement('button'));
    expect(fakeInstances).toHaveLength(0);
  });

  it('wires datetime mode (showTime: true) with timepicker enabled', () => {
    const {input, button} = installPickerDom();
    initDatePicker(input, button, {showTime: true});
    expect(fakeInstances).toHaveLength(1);
    expect(fakeInstances[0].opts.timepicker).toBe(true);
    expect(fakeInstances[0].opts.minutesStep).toBe(15);
    expect(fakeInstances[0].opts.showEvent).toBe('adp-never-fire');
    button.click();
    expect(fakeInstances[0].shows).toBe(1);
  });

  it('wires date-only mode (no showTime) without timepicker', () => {
    const {input, button} = installPickerDom();
    initDatePicker(input, button);
    expect(fakeInstances).toHaveLength(1);
    expect(fakeInstances[0].opts.timepicker).toBeUndefined();
    expect(fakeInstances[0].opts.showEvent).toBe('adp-never-fire');
    button.click();
    expect(fakeInstances[0].shows).toBe(1);
  });

  it('destroys previous instance on re-init (HTMX swap)', () => {
    const {input, button} = installPickerDom();
    initDatePicker(input, button);
    initDatePicker(input, button);
    expect(fakeInstances).toHaveLength(2);
    expect(fakeInstances[0].destroyed).toBe(true);
    button.click();
    expect(fakeInstances[1].shows).toBe(1);
  });
});

describe('initGeneratorTimePickers with a recording AirDatepicker fake', () => {
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

  function installGeneratorDom() {
    const buttons = [];
    const inputs = [];
    for (let i = 0; i < 7; i += 1) {
      const input = document.createElement('input');
      input.id = `time-${i}`;
      input.setAttribute('name', 'time[]');
      const button = document.createElement('button');
      button.id = `time-${i}-picker`;
      document.body.appendChild(input);
      document.body.appendChild(button);
      inputs.push(input);
      buttons.push(button);
    }
    return {inputs, buttons};
  }

  function installSinglePickerDom() {
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

  it('mounts one time-only picker per row with 15-minute steps and never-on-focus', () => {
    installGeneratorDom();
    initGeneratorTimePickers();
    expect(fakeInstances).toHaveLength(7);
    for (const instance of fakeInstances) {
      // onlyTimepicker alone does not build the time sliders; the vendor gates
      // _addTimepicker() on `timepicker`, so both must be set.
      expect(instance.opts.timepicker).toBe(true);
      expect(instance.opts.onlyTimepicker).toBe(true);
      expect(instance.opts.minutesStep).toBe(15);
      expect(instance.opts.hoursStep).toBeUndefined();
      // the picker is wired to a never-fired show event, so it never opens on
      // input focus — only via the explicit row button.
      expect(instance.opts.showEvent).toBe('adp-never-fire');
    }
  });

  it('seeds the picker time to 20:00 via startDate instead of the current time', () => {
    installGeneratorDom();
    initGeneratorTimePickers();
    expect(fakeInstances).toHaveLength(7);
    for (const instance of fakeInstances) {
      // The sliders seed from viewDate (= startDate) when nothing is selected,
      // so an empty row opens at the evening default, not the wall clock. The
      // input itself stays empty — startDate never writes into the field.
      expect(instance.opts.startDate.getHours()).toBe(20);
      expect(instance.opts.startDate.getMinutes()).toBe(0);
    }
  });

  it('each row button opens exactly its own picker', () => {
    const {buttons} = installGeneratorDom();
    initGeneratorTimePickers();
    buttons.forEach((button, i) => {
      expect(fakeInstances[i].shows).toBe(0);
      button.click();
      expect(fakeInstances[i].shows).toBe(1);
    });
  });

  it('destroys stale instances on an HTMX swap and rebinds every re-rendered input once', () => {
    installSinglePickerDom();
    installGeneratorDom();
    initProposedDateTimePicker();
    initGeneratorTimePickers();
    expect(fakeInstances).toHaveLength(8);

    // Simulate a partial swap: the whole section is replaced by fresh DOM.
    document.body.innerHTML = '';
    const freshSingle = installSinglePickerDom();
    installGeneratorDom();
    initProposedDateTimePicker();
    initGeneratorTimePickers();

    expect(fakeInstances).toHaveLength(16);
    // every pre-swap instance is destroyed, no stale instance survives
    expect(fakeInstances.slice(0, 8).every((instance) => instance.destroyed)).toBe(true);
    // every fresh input has exactly one live picker (none bound twice)
    expect(fakeInstances.slice(8).length).toBe(8);
    expect(fakeInstances.slice(8).every((instance) => !instance.destroyed)).toBe(true);

    // the rebound buttons open the fresh instances, not the destroyed ones
    freshSingle.button.click();
    expect(fakeInstances[8].shows).toBe(1);
    expect(fakeInstances[0].shows).toBe(0);
  });
});

describe('initGeneratorDatePickers with a recording AirDatepicker fake', () => {
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

  function installGeneratorDateDom() {
    const fromInput = document.createElement('input');
    fromInput.id = 'fromDate';
    const fromButton = document.createElement('button');
    fromButton.id = 'fromDate-picker';
    const toInput = document.createElement('input');
    toInput.id = 'toDate';
    const toButton = document.createElement('button');
    toButton.id = 'toDate-picker';
    document.body.appendChild(fromInput);
    document.body.appendChild(fromButton);
    document.body.appendChild(toInput);
    document.body.appendChild(toButton);
    return {fromInput, fromButton, toInput, toButton};
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

  it('mounts one date-only picker per From/To field with no timepicker', () => {
    installGeneratorDateDom();
    initGeneratorDatePickers();
    expect(fakeInstances).toHaveLength(2);
    expect(fakeInstances[0].input.id).toBe('fromDate');
    expect(fakeInstances[1].input.id).toBe('toDate');
    for (const instance of fakeInstances) {
      // date-only mode: no timepicker, opens only via the explicit button.
      expect(instance.opts.timepicker).toBeUndefined();
      expect(instance.opts.showEvent).toBe('adp-never-fire');
    }
  });

  it('each From/To button opens exactly its own picker', () => {
    const {fromButton, toButton} = installGeneratorDateDom();
    initGeneratorDatePickers();
    expect(fakeInstances[0].shows).toBe(0);
    expect(fakeInstances[1].shows).toBe(0);
    fromButton.click();
    expect(fakeInstances[0].shows).toBe(1);
    expect(fakeInstances[1].shows).toBe(0);
    toButton.click();
    expect(fakeInstances[0].shows).toBe(1);
    expect(fakeInstances[1].shows).toBe(1);
  });

  it('destroys stale instances on an HTMX swap and rebinds every re-rendered input once', () => {
    installGeneratorDateDom();
    initGeneratorDatePickers();
    expect(fakeInstances).toHaveLength(2);

    // Simulate a partial swap: the section is replaced by fresh DOM.
    document.body.innerHTML = '';
    installGeneratorDateDom();
    initGeneratorDatePickers();

    expect(fakeInstances).toHaveLength(4);
    expect(fakeInstances.slice(0, 2).every((instance) => instance.destroyed)).toBe(true);
    expect(fakeInstances.slice(2).every((instance) => !instance.destroyed)).toBe(true);
    fakeInstances[0].show = () => {
      fakeInstances[0].shows += 1;
    };
    document.getElementById('fromDate-picker').click();
    expect(fakeInstances[2].shows).toBe(1);
    expect(fakeInstances[0].shows).toBe(0);
  });
});

describe('additional branch coverage', () => {
  describe('initHtmx with htmx present', () => {
    it('configures htmx and drives the spinner from the request lifecycle', () => {
      const spinner = {show: vi.fn(), hide: vi.fn()};
      vi.stubGlobal('htmx', {config: {defaultSwapStyle: ''}});

      initHtmx(spinner);

      expect(htmx.config.defaultSwapStyle).toBe('outerHTML');
      document.dispatchEvent(new Event('htmx:beforeRequest'));
      document.dispatchEvent(new Event('htmx:afterRequest'));
      document.dispatchEvent(new Event('htmx:responseError'));
      document.dispatchEvent(new Event('htmx:sendError'));
      document.dispatchEvent(new Event('htmx:timeout'));
      document.dispatchEvent(new Event('htmx:historyCacheMiss'));
      document.dispatchEvent(new Event('htmx:historyRestore'));
      expect(spinner.show).toHaveBeenCalledTimes(2);
      expect(spinner.hide).toHaveBeenCalledTimes(5);

      const err = new CustomEvent('htmx:beforeOnLoad', {
        detail: {xhr: {status: 400, responseText: '<div>base</div>'}, shouldSwap: true, isError: true},
      });
      document.dispatchEvent(err);
      expect(err.detail.shouldSwap).toBe(true);
      expect(err.detail.isError).toBe(false);

      const ok = new CustomEvent('htmx:beforeOnLoad', {
        detail: {xhr: {status: 200, responseText: ''}, shouldSwap: true, isError: false},
      });
      document.dispatchEvent(ok);
      expect(ok.detail.shouldSwap).toBe(true);

      vi.unstubAllGlobals();
    });
  });

  describe('initTheme with ui present', () => {
    it('applies the BeerCSS theme', () => {
      const ui = vi.fn();
      vi.stubGlobal('ui', ui);

      initTheme();

      expect(ui).toHaveBeenCalledWith('theme', '#1a237e');
      vi.unstubAllGlobals();
    });
  });

  describe('initLanguage', () => {
    afterEach(() => {
      localStorage.clear();
      window.history.replaceState({}, '', '/');
    });

    it('stores a supported ?lang value', () => {
      window.history.replaceState({}, '', '/?lang=fr-CH');
      localStorage.clear();

      initLanguage();

      expect(localStorage.getItem('lang')).toBe('fr-CH');
    });

    it('ignores an unsupported ?lang value and leaves storage alone', () => {
      window.history.replaceState({}, '', '/?lang=xx-XX');
      localStorage.setItem('lang', 'en-US');

      initLanguage();

      expect(localStorage.getItem('lang')).toBe('en-US');
    });
  });

  describe('initFocusManagement fallbacks', () => {
    beforeAll(() => {
      initFocusManagement();
    });

    it('handles missing detail, headingless targets, and non-section elements', () => {
      document.dispatchEvent(new Event('htmx:afterSettle'));

      const main = document.createElement('div');
      main.id = 'main-content';
      document.body.append(main);
      document.dispatchEvent(new CustomEvent('htmx:afterSettle', {detail: {elt: main}}));

      const plain = document.createElement('div');
      document.body.append(plain);
      document.dispatchEvent(new CustomEvent('htmx:afterSettle', {detail: {elt: plain}}));

      const section = document.createElement('div');
      section.id = 'team-management';
      document.body.append(section);
      document.dispatchEvent(new CustomEvent('htmx:afterSettle', {detail: {elt: section}}));

      expect(main.querySelector('h2, h3, h4')).toBe(null);
    });
  });

  describe('initRedesignDisclosures', () => {
    let realMatchMedia;

    beforeEach(() => {
      realMatchMedia = window.matchMedia;
      document.body.innerHTML = '';
    });

    afterEach(() => {
      window.matchMedia = realMatchMedia;
      document.body.innerHTML = '';
    });

    function installDisclosure() {
      const wrap = document.createElement('div');
      wrap.className = 'edit-redesign';
      const details = document.createElement('details');
      details.className = 'side-details';
      wrap.append(details);
      document.body.append(wrap);
      return details;
    }

    it('collapses side details on phone widths and opens them on desktop', () => {
      const details = installDisclosure();

      window.matchMedia = vi.fn(() => ({matches: true, addEventListener: vi.fn()}));
      initRedesignDisclosures();
      expect(details.open).toBe(false);

      window.matchMedia = vi.fn(() => ({matches: false, addEventListener: vi.fn()}));
      initRedesignDisclosures();
      expect(details.open).toBe(true);
    });

    it('skips the change listener when matchMedia lacks addEventListener', () => {
      installDisclosure();
      window.matchMedia = vi.fn(() => ({matches: true}));

      expect(() => initRedesignDisclosures()).not.toThrow();
    });
  });

  describe('initOccupancyTooltips outside a trigger', () => {
    beforeAll(() => {
      initOccupancyTooltips();
    });

    it('ignores pointerover, non-Escape keys, and Escape away from a trigger', () => {
      const plain = document.createElement('div');
      document.body.append(plain);

      plain.dispatchEvent(new Event('pointerover', {bubbles: true}));
      plain.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
      plain.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));

      expect(plain.classList.contains('is-open')).toBe(false);
    });
  });

  describe('initDeleteDialogs without dialog APIs', () => {
    beforeAll(() => {
      initDeleteDialogs();
    });

    it('does nothing when the target lacks showModal or close', () => {
      const trigger = document.createElement('button');
      trigger.setAttribute('data-open-dialog', 'not-a-dialog');
      const notDialog = document.createElement('div');
      notDialog.id = 'not-a-dialog';
      const dismiss = document.createElement('button');
      dismiss.setAttribute('data-dismiss-dialog', '');
      document.body.append(trigger, notDialog, dismiss);

      trigger.click();
      dismiss.click();

      expect(notDialog.hasAttribute('open')).toBe(false);
    });
  });

  describe('picker locale resolution', () => {
    let realAirDatepicker;
    let realLocale;

    beforeEach(() => {
      realAirDatepicker = window.AirDatepicker;
      realLocale = window.AirDatepickerLocale;
      document.body.innerHTML = '';
    });

    afterEach(() => {
      window.AirDatepicker = realAirDatepicker;
      window.AirDatepickerLocale = realLocale;
      document.body.innerHTML = '';
    });

    it('falls back to de-CH when the document language has no locale', () => {
      const instances = [];
      window.AirDatepicker = class {
        constructor(_input, options) {
          this.opts = options;
          instances.push(this);
        }

        destroy() {
        }

        show() {
        }
      };
      window.AirDatepickerLocale = {
        'de-CH': {dateFormat: 'dd.MM.yyyy', timeFormat: 'HH:mm', hours: 'Stunden', minutes: 'Minuten'},
      };
      document.documentElement.lang = 'fr-CH';
      const input = document.createElement('input');
      document.body.append(input);

      initDatePicker(input, null);

      expect(instances).toHaveLength(1);
      expect(instances[0].opts.locale.dateFormat).toBe('dd.MM.yyyy');
    });

    it('no-ops when neither the language nor de-CH is available', () => {
      window.AirDatepicker = class {
        constructor() {
          throw new Error('should not mount');
        }
      };
      window.AirDatepickerLocale = {};
      document.documentElement.lang = 'fr-CH';
      const input = document.createElement('input');
      document.body.append(input);

      expect(() => initDatePicker(input, null)).not.toThrow();
    });
  });

  describe('mountPicker recovery from an unparseable echoed value', () => {
    it('retries without a selection', () => {
      const created = [];
      const realAirDatepicker = window.AirDatepicker;
      const realLocale = window.AirDatepickerLocale;
      window.AirDatepicker = class {
        constructor(_input, options) {
          if (options.selectedDates.length > 0) {
            throw new Error('bad date');
          }
          created.push(options.selectedDates);
        }

        destroy() {
        }

        show() {
        }
      };
      window.AirDatepickerLocale = {
        'de-CH': {dateFormat: 'dd.MM.yyyy', timeFormat: 'HH:mm', hours: 'H', minutes: 'M'},
      };
      document.documentElement.lang = 'de-CH';
      const input = document.createElement('input');
      input.id = 'proposedDateTime';
      input.value = 'not-a-date';
      document.body.append(input);

      initProposedDateTimePicker();

      expect(created).toEqual([[]]);
      window.AirDatepicker = realAirDatepicker;
      window.AirDatepickerLocale = realLocale;
      document.body.innerHTML = '';
    });
  });

  describe('initGeneratorDatePickers with a missing field', () => {
    it('skips a From/To field that is not in the DOM', () => {
      const realAirDatepicker = window.AirDatepicker;
      const realLocale = window.AirDatepickerLocale;
      window.AirDatepicker = class {
        constructor() {
          throw new Error('should not mount');
        }
      };
      window.AirDatepickerLocale = {
        'de-CH': {dateFormat: 'dd.MM.yyyy', timeFormat: 'HH:mm', hours: 'H', minutes: 'M'},
      };
      document.documentElement.lang = 'de-CH';
      document.body.innerHTML = '';

      expect(() => initGeneratorDatePickers()).not.toThrow();
      window.AirDatepicker = realAirDatepicker;
      window.AirDatepickerLocale = realLocale;
    });
  });

  describe('patchTimeSliderLabels via the picker onShow', () => {
    const fakeInstances = [];

    class FakeAirDatepicker {
      constructor(input, options) {
        this.input = input;
        this.opts = options;
        this.$datepicker = document.createElement('div');
        this.$datepicker.innerHTML = '<input type="range"><input type="range"><input type="range">';
        fakeInstances.push(this);
      }

      destroy() {
      }

      show() {
      }
    }

    let realAirDatepicker;
    let realLocale;

    beforeEach(() => {
      realAirDatepicker = window.AirDatepicker;
      realLocale = window.AirDatepickerLocale;
      window.AirDatepicker = FakeAirDatepicker;
      window.AirDatepickerLocale = {
        'de-CH': {dateFormat: 'dd.MM.yyyy', timeFormat: 'HH:mm', hours: 'Stunden', minutes: 'Minuten'},
      };
      document.documentElement.lang = 'de-CH';
      fakeInstances.length = 0;
      const input = document.createElement('input');
      input.id = 'proposedDateTime';
      const button = document.createElement('button');
      button.id = 'proposedDateTimePicker';
      document.body.append(input, button);
    });

    afterEach(() => {
      window.AirDatepicker = realAirDatepicker;
      window.AirDatepickerLocale = realLocale;
      document.body.innerHTML = '';
    });

    it('labels the hour and minute sliders and blanks any extra slider', () => {
      initProposedDateTimePicker();
      expect(fakeInstances).toHaveLength(1);
      const picker = fakeInstances[0];

      picker.opts.onShow();

      const sliders = picker.$datepicker.querySelectorAll('input[type="range"]');
      expect(sliders[0].getAttribute('aria-label')).toBe('Stunden');
      expect(sliders[1].getAttribute('aria-label')).toBe('Minuten');
      expect(sliders[2].getAttribute('aria-label')).toBe('');
    });
  });

  describe('restoreVoteFocus fallbacks', () => {
    beforeAll(() => {
      initVoteForm({
        show() {
        }
      });
    });

    it('returns quietly without a focus record or a vote form', () => {
      sessionStorage.clear();
      window.dispatchEvent(new Event('pageshow'));

      sessionStorage.setItem('postpony-vote-focus', JSON.stringify({name: 'vote-x', value: 'Yes'}));
      expect(() => window.dispatchEvent(new Event('pageshow'))).not.toThrow();
      expect(document.querySelector('.vote-radio-group')).toBe(null);
      sessionStorage.clear();
    });
  });
});
