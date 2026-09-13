/**
 * Pure predicate: decides whether an HTMX error response body carries
 * non-out-of-band content worth swapping into the DOM.
 * @param {string} responseText
 * @returns {boolean}
 */
export function shouldSwapErrorBody(responseText) {
  const doc = new DOMParser().parseFromString(responseText, 'text/html');
  const hasOob = doc.body.querySelector('[hx-swap-oob]') !== null;
  const nonOobContent = [...doc.body.children]
    .filter(el => !el.hasAttribute('hx-swap-oob'))
    .some(el => el.textContent.trim().length > 0);
  return nonOobContent || !hasOob;
}

/**
 * Pure function: decides whether to redirect for language sync.
 * @param {string} queryString - Full search string from URL
 * @param {string} path - Current pathname
 * @param {string} currentLang - Document's lang attribute
 * @param {string|null} storedLang - Value from localStorage
 * @returns {string|null} Redirect URL or null if no redirect needed
 */
export function decideLanguageRedirect(queryString, path, currentLang, storedLang) {
  if (!storedLang || storedLang === currentLang) return null;
  if (queryString.includes('lang=')) return null;
  return path + '?lang=' + storedLang;
}

/**
 * Initializes HTMX configuration and event listeners for the spinner.
 * @param {import('./spinner-module.js').Spinner} spinner
 */
export function initHtmx(spinner) {
  if (typeof htmx === 'undefined') {
    return;
  }
  htmx.config.defaultSwapStyle = 'outerHTML';
  document.addEventListener('htmx:beforeRequest', () => spinner.show());
  document.addEventListener('htmx:afterRequest', () => spinner.hide());
  document.addEventListener('htmx:responseError', () => spinner.hide());
  document.addEventListener('htmx:sendError', () => spinner.hide());
  document.addEventListener('htmx:timeout', () => spinner.hide());
  document.addEventListener('htmx:historyCacheMiss', () => spinner.show());
  document.addEventListener('htmx:historyRestore', () => spinner.hide());
  document.addEventListener('htmx:beforeOnLoad', (evt) => {
    const status = evt.detail.xhr.status;
    if (status >= 400 && status < 600) {
      evt.detail.shouldSwap = shouldSwapErrorBody(evt.detail.xhr.responseText);
      evt.detail.isError = false;
    }
  });
}

/**
 * Initializes the UI theme using BeerCSS.
 */
export function initTheme() {
  if (typeof ui === 'function') {
    ui('theme', '#1a237e');
  }
}

/**
 * Handles language persistence using localStorage and URL parameters.
 */
export function initLanguage() {
  const urlParams = new URLSearchParams(window.location.search);
  const queryLang = urlParams.get('lang');
  const supportedLocales = ['de-CH', 'fr-CH', 'it-CH', 'en-US'];

  if (queryLang && supportedLocales.includes(queryLang)) {
    localStorage.setItem('lang', queryLang);
  }

  const currentLang = document.documentElement.lang;
  const storedLang = localStorage.getItem('lang');
  const redirect = decideLanguageRedirect(
    window.location.search,
    window.location.pathname,
    currentLang,
    storedLang,
  );
  if (redirect) {
    window.location.href = redirect;
  }
}

/**
 * Shows/hides one venue-occupancy tooltip by toggling `.is-open` on its host
 * (the `.venue-occupancy` wrapper holding the count chip and the popup). The
 * CSS renders the `role="tooltip"` popup only when the host is open.
 * @param {HTMLElement} host
 * @param {boolean} open
 */
function setOccupancyTooltip(host, open) {
  host.classList.toggle('is-open', open);
}

/**
 * Wires the venue-occupancy count chips to their `role="tooltip"` popups.
 * Shown on hover (pointerover), keyboard focus (focusin), and tap (click);
 * dismissed by pointer leave (pointerout outside the host), focus loss
 * (focusout outside the host), clicking anywhere else, or Escape (which also
 * returns focus to the chip). All listeners are delegated on `document`, so
 * they survive HTMX swaps that re-render the proposed-date list or vote form.
 */
export function initOccupancyTooltips() {
  document.addEventListener('pointerover', (e) => {
    const host = e.target.closest('.venue-occupancy');
    if (host) setOccupancyTooltip(host, true);
  });
  document.addEventListener('pointerout', (e) => {
    const host = e.target.closest('.venue-occupancy');
    if (host && !host.contains(e.relatedTarget)) setOccupancyTooltip(host, false);
  });
  document.addEventListener('focusin', (e) => {
    const trigger = e.target.closest('[data-occupancy-trigger]');
    if (trigger) setOccupancyTooltip(trigger.closest('.venue-occupancy'), true);
  });
  document.addEventListener('focusout', (e) => {
    const host = e.target.closest('.venue-occupancy');
    if (host && !host.contains(e.relatedTarget)) setOccupancyTooltip(host, false);
  });
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-occupancy-trigger]');
    if (trigger) {
      setOccupancyTooltip(trigger.closest('.venue-occupancy'), true);
    } else if (!e.target.closest('.venue-occupancy')) {
      document.querySelectorAll('.venue-occupancy.is-open')
        .forEach((host) => setOccupancyTooltip(host, false));
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const trigger = e.target.closest('[data-occupancy-trigger]');
    if (trigger) {
      setOccupancyTooltip(trigger.closest('.venue-occupancy'), false);
      trigger.focus();
    }
  });
}

/**
 * Handles click-to-copy for [data-copy] buttons: writes the link to the
 * clipboard, swaps the icon to a check, and announces the localized "copied"
 * label via the shared visually-hidden `role="status"` element for ~2 s.
 */
export function initClipboard() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    navigator.clipboard.writeText(btn.dataset.copy);

    const status = document.getElementById('clipboard-status');
    if (status && btn.dataset.copiedLabel) {
      status.textContent = btn.dataset.copiedLabel;
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    }

    const icon = btn.querySelector('i');
    if (icon) {
      const original = icon.textContent;
      icon.textContent = 'check';
      setTimeout(() => {
        icon.textContent = original;
      }, 2000);
    }
  });
}

// Generalised air-datepicker lifecycle: a page hosts up to eight pickers — the
// single Proposed Date picker plus one time-only picker per generator weekday
// row. Instances are keyed by their input element; every HTMX swap both prunes
// pickers whose input left the DOM and re-mounts re-rendered inputs, so no
// stale instance survives and a live input is never bound by two pickers.
const pickerInstances = new Map();

/**
 * Resolves the active air-datepicker locale from the document language.
 * Returns null when the vendored bundle is absent so callers can no-op.
 * @returns {object|null}
 */
function resolvePickerLocale() {
  if (typeof AirDatepicker === 'undefined') return null;
  const locales = window.AirDatepickerLocale || {};
  return locales[document.documentElement.lang] || locales['de-CH'] || null;
}

/**
 * Destroys instances whose input left the DOM (no stale instance survives an
 * HTMX partial swap; detached inputs are never re-queued).
 */
function pruneDetachedPickers() {
  for (const [input, agent] of pickerInstances) {
    if (!input.isConnected) {
      agent.destroy();
      pickerInstances.delete(input);
    }
  }
}

/**
 * Mounts one air-datepicker on `input`, wired to open only via the explicit
 * `button` (never on focus) and to keep the field a plain text input. A
 * re-mount of the same input destroys the previous instance first, so repeated
 * init calls leave exactly one live picker per input.
 * @param {HTMLInputElement} input
 * @param {HTMLButtonElement|null} button
 * @param {object} options
 */
function mountPicker(input, button, options) {
  pickerInstances.get(input)?.destroy();
  pickerInstances.delete(input);

  let picker = null;
  const agent = {
    show() {
      picker?.show();
    },
    destroy() {
      picker?.destroy();
      picker = null;
    },
  };

  const build = (selectedDates) => new AirDatepicker(input, {
    ...options,
    onShow: () => patchTimeSliderLabels(picker),
    selectedDates,
  });
  try {
    picker = build(input.value ? [input.value] : []);
  } catch {
    // ponytail: an unparseable echoed value (validation error) must not kill
    // the picker; retry without a selection so it still opens for picking.
    picker = build([]);
  }

  if (button) {
    button.onclick = (e) => {
      e.preventDefault();
      agent.show();
    };
  }
  pickerInstances.set(input, agent);
}

/**
 * Progressively enhances an input with an air-datepicker calendar. The picker
 * opens only via the explicit calendar button (never on focus) and writes the
 * locale's token format. `showTime` controls whether a time picker is included
 * (datetime mode) or omitted (date-only mode, ready for From/To fields).
 * @param {HTMLInputElement} input
 * @param {HTMLButtonElement|null} button
 * @param {{ showTime?: boolean }} [config]
 */
export function initDatePicker(input, button, config) {
  const locale = resolvePickerLocale();
  if (!input || !locale) return;
  pruneDetachedPickers();
  const showTime = config?.showTime ?? false;

  mountPicker(
    input,
    button,
    {
      locale,
      dateFormat: locale.dateFormat,
      ...(showTime
        ? {timeFormat: locale.timeFormat, dateTimeSeparator: ' ', timepicker: true, minutesStep: 15}
        : {}),
      // ponytail: a never-fired event keeps the picker closed until the explicit
      // button calls show(); `''` would also work but the string event is clearer.
      showEvent: 'adp-never-fire',
      position: 'top center',
    },
  );
}

/**
 * Progressively enhances the proposed-date input with air-datepicker. The
 * picker is opened only via the explicit calendar button, never on focus, and
 * writes the locale's token format, which matches the input placeholder and
 * the server grammar, e.g. `02.08.2026 20:00` or `08/02/2026 08:00 pm`.
 */
export function initProposedDateTimePicker() {
  initDatePicker(
    document.getElementById('proposedDateTime'),
    document.getElementById('proposedDateTimePicker'),
    {showTime: true},
  );
}

/**
 * Progressively enhances every weekday row of the Proposed Dates Generator
 * with a time-only air-datepicker (`onlyTimepicker` → no date view). The picker
 * opens only via each row's button, steps minutes in 15-minute increments, and
 * writes the locale's time token (`HH:mm` / `hh:mm aa`) into the row input —
 * which matches the row's placeholder, leaving typed off-grid values untouched.
 */
export function initGeneratorTimePickers() {
  const locale = resolvePickerLocale();
  if (!locale) return;
  pruneDetachedPickers();

  // The generator's fixed Monday–Sunday grid; one time-only picker per row.
  const defaultTime = new Date();
  defaultTime.setHours(20, 0, 0, 0);
  document.querySelectorAll('input[name="time[]"]')
    .forEach((input) => {
      mountPicker(
        input,
        document.getElementById(`${input.id}-picker`),
        {
          locale,
          // onlyTimepicker hides the date view but does NOT build the time
          // sliders by itself — the vendor gates _addTimepicker() on `timepicker`.
          timepicker: true,
          onlyTimepicker: true,
          timeFormat: locale.timeFormat,
          // Quarter-hour increments on the minute slider; hoursStep keeps the
          // vendor default of 1.
          minutesStep: 15,
          // The sliders seed from viewDate (= startDate) when nothing is
          // selected, so an empty row opens at the evening default (20:00)
          // instead of the wall clock. startDate never writes into the field.
          startDate: defaultTime,
          showEvent: 'adp-never-fire',
          position: 'top center',
        },
      );
    });
}

/**
 * Progressively enhances the generator's From and To date fields with a
 * date-only air-datepicker each (no time picker). Each picker opens only via
 * its own explicit calendar button, never on input focus, and writes the
 * locale's date tokens into the field — matching the field placeholder and the
 * server's locale-aware date-only grammar. The fields stay free-form text
 * inputs, so a picker is a pure enhancement.
 */
export function initGeneratorDatePickers() {
  const locale = resolvePickerLocale();
  if (!locale) return;
  pruneDetachedPickers();

  [['fromDate', 'fromDate-picker'], ['toDate', 'toDate-picker']]
    .forEach(([inputId, buttonId]) => {
      const input = document.getElementById(inputId);
      if (!input) return;
      initDatePicker(input, document.getElementById(buttonId), {showTime: false});
    });
}

// ponytail: air-datepicker ships no ARIA labels on its time sliders; patch
// them with localized names so axe (and screen readers) see labelled fields.
// The picker builds its DOM lazily on first show, hence this runs per open. The
// full datetime picker and every time-only picker expose the same two ranges.
function patchTimeSliderLabels(picker) {
  if (!picker) return;
  const locale = picker.opts.locale;
  const sliderLabels = [locale.hours, locale.minutes];
  picker.$datepicker.querySelectorAll('input[type="range"]')
    .forEach((slider, i) => {
      slider.setAttribute('aria-label', sliderLabels[i] ?? '');
    });
}

/**
 * Opens a `<dialog>` from a `[data-open-dialog]` trigger. Delegated on
 * `document`, so it survives HTMX swaps that re-render the proposed-date list
 * (each item carries its own delete-confirmation dialog).
 */
export function initDeleteDialogs() {
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-dialog]');
    if (trigger) {
      const dialog = document.getElementById(trigger.dataset.openDialog);
      if (dialog && typeof dialog.showModal === 'function') {
        dialog.showModal();
        return;
      }
    }
    const dismiss = event.target.closest('[data-dismiss-dialog]');
    if (dismiss) {
      const dialog = dismiss.closest('dialog');
      if (dialog && typeof dialog.close === 'function') {
        dialog.close();
      }
    }
  });
}

// Session-scoped record of the vote control to refocus after the full-page
// save reload; written by initVoteForm just before the POST and cleared by
// restoreVoteFocus on the reloaded page. JSON `{name?, value}`.
const VOTE_FOCUS_KEY = 'postpony-vote-focus';

/**
 * Records the vote control to refocus after the save reload. Storage is
 * best-effort: a browser with sessionStorage disabled just skips the
 * enhancement.
 * @param {{name?: string, value: string}} target
 */
function rememberVoteFocus(target) {
  try {
    sessionStorage.setItem(VOTE_FOCUS_KEY, JSON.stringify(target));
  } catch {
    // ponytail: private mode / storage disabled — no focus restore, no error.
  }
}

/**
 * Moves focus, without scrolling, to the control recorded before the save
 * reload, then clears the record. Best-effort: a missing key, form, or target
 * (date deleted, status Confirmed) leaves focus untouched and does not throw.
 */
function restoreVoteFocus() {
  let stored;
  try {
    const raw = sessionStorage.getItem(VOTE_FOCUS_KEY);
    if (!raw) return;
    sessionStorage.removeItem(VOTE_FOCUS_KEY);
    stored = JSON.parse(raw);
  } catch {
    return;
  }
  const form = document.querySelector('.vote-radio-group')
    ?.closest('form');
  if (!form || !stored) return;
  const target = stored.name
    ? [...form.querySelectorAll('.vote-radio-group input[type="radio"]')]
      .find((radio) => radio.name === stored.name && radio.value === stored.value)
    : [...form.querySelectorAll('button[data-set-all]')]
      .find((button) => button.dataset.setAll === stored.value);
  target?.focus({preventScroll: true});
}

/**
 * Wires the vote form for direct submission. Each "Set all: Yes / No / if
 * necessary" button checks every `vote-<dateId>` radio of its target value and
 * then posts the form immediately; a change to any single vote radio posts the
 * form too, after a short debounce so arrowing through the options saves once.
 * There is no separate submit button — the server casts only the dates present
 * in the request, so votes are saved incrementally per change.
 *
 * While a save is in flight the form is `aria-busy`, its controls are disabled
 * and the global spinner shows; further clicks/changes are ignored. The busy
 * state resets on `pageshow` because a bfcache restore brings the frozen DOM
 * back, and `pageshow` also restores focus to the control the Participant just
 * changed. Delegated on `document`, so a set-all row injected after
 * initialization still works.
 * @param {import('./spinner-module.js').Spinner} [spinner] global spinner to show while saving
 */
export function initVoteForm(spinner) {
  const voteTypes = ['Yes', 'No', 'IfNecessary'];
  const voteControls = 'button[data-set-all], .vote-radio-group input[type="radio"]';
  // ponytail: one in-flight save and one debounce timer for the page's single
  // vote form; keyed by form so a re-rendered form is never born busy.
  let pendingForms = new WeakSet();
  let timer = null;

  window.addEventListener('pageshow', () => {
    clearTimeout(timer);
    timer = null;
    pendingForms = new WeakSet();
    document.querySelectorAll('form[aria-busy="true"]')
      .forEach((form) => {
        form.removeAttribute('aria-busy');
        form.querySelectorAll(voteControls)
          .forEach((control) => {
            control.disabled = false;
          });
      });
    restoreVoteFocus();
  });

  // The single submit path both handlers share; it remembers the control the
  // Participant changed so the reload can put focus back on it.
  const submit = (form, focusTarget) => {
    if (pendingForms.has(form)) return;
    pendingForms.add(form);
    form.setAttribute('aria-busy', 'true');
    spinner?.show();
    rememberVoteFocus(focusTarget);
    // ponytail: form.submit() captures the entry list synchronously, so
    // disabling the controls afterwards keeps them out of the *next* submission
    // without dropping any changed vote from this one.
    form.submit();
    form.querySelectorAll(voteControls)
      .forEach((control) => {
        control.disabled = true;
      });
  };

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-set-all]');
    if (!btn) return;
    const value = btn.dataset.setAll;
    if (!voteTypes.includes(value)) return;
    const form = btn.closest('form');
    if (!form || pendingForms.has(form)) return;
    // A set-all click wins over a scheduled radio save.
    clearTimeout(timer);
    timer = null;
    // ponytail: checking the target radio unchecks its siblings via native
    // radio semantics; the `.vote-radio-group` class scopes the fill to the
    // date rows the server renders, so a stray radio with a vote-like name
    // elsewhere in the form is never stamped.
    form.querySelectorAll('.vote-radio-group input[type="radio"]')
      .forEach((radio) => {
        if (radio.value === value) radio.checked = true;
      });
    submit(form, {value});
  });

  document.addEventListener('change', (event) => {
    const radio = event.target.closest('.vote-radio-group input[type="radio"]');
    if (!radio) return;
    const form = radio.closest('form');
    if (!form || pendingForms.has(form)) return;
    // ponytail: a keyboard user arrowing through the options fires a change per
    // keypress; debounce so they get one save once they settle.
    clearTimeout(timer);
    timer = setTimeout(() => submit(form, {name: radio.name, value: radio.value}), 400);
  });
}

/**
 * Focuses a heading inside the swap target, or the error alert when validation fails.
 * Called from hx-on::after-request on forms that trigger partial swaps.
 */
export function initFocusManagement() {
  document.addEventListener('htmx:afterSettle', function (evt) {
    // ponytail: htmx reports the swapped element as evt.detail.elt; evt.target
    // is the dispatched-on node. Prefer detail.elt so the section/heading
    // branches fire even when the swap target is the whole edit grid (the
    // redesign replaced per-section targets with #edit-grid).
    var detail = evt.detail || {};
    var el = detail.elt || evt.target;
    if (!el || el.nodeType !== 1) return;

    initProposedDateTimePicker();
    initGeneratorTimePickers();
    initGeneratorDatePickers();
    initRedesignDisclosures();

    if (el.matches('#main-content')) {
      var h = el.querySelector('h2, h3, h4');
      if (h) {
        h.setAttribute('tabindex', '-1');
        h.focus();
      }
      return;
    }

    if (el.matches('#team-management, #venue-management, #proposed-dates-management, #edit-grid')) {
      // ponytail: htmx already refocuses the interacted control (matched by
      // id) after a swap, with preventScroll; only fall back to the heading
      // when there is nothing to restore, and never scroll the page for it.
      if (el.contains(document.activeElement)) return;
      var heading = el.querySelector('h2, h3, h4');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({preventScroll: true});
      }
    }
  });
}

export function initRedesignDisclosures() {
  // ponytail: the redesigned edit sidebar keeps roster/generator in open
  // disclosures on desktop but collapses them on phones, so the week rail is
  // the first thing the organizer sees. Re-applied on load, on HTMX swaps and
  // on the breakpoint crossing; a manual toggle survives until one of those.
  var mq = window.matchMedia('(max-width: 1023px)');
  function apply() {
    document.querySelectorAll('.edit-redesign details.side-details').forEach(function (details) {
      details.open = !mq.matches;
    });
  }
  apply();
  if (mq.addEventListener) {
    mq.addEventListener('change', apply);
  }
}
