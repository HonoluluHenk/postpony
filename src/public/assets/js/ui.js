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

// Session-scoped record of the vote control to refocus after the HTMX save
// swap; written by initVoteForm just before the submit and cleared by
// restoreVoteFocus once the fresh #vote-region lands. JSON `{name?, value}`.
const VOTE_FOCUS_KEY = 'postpony-vote-focus';

/**
 * Records the vote control to refocus after the save swap. Storage is
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
 * swap, then clears the record. Best-effort: a missing key, form, or target
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
 * then submits the form immediately; a change to any single vote radio submits
 * the form too, after a short debounce so arrowing through the options saves
 * once. There is no separate submit button — the server casts only the dates
 * present in the request, so votes are saved incrementally per change.
 *
 * The form carries `hx-post`, so `requestSubmit()` becomes an HTMX swap of
 * `#vote-region` instead of a full page load. While a save is in flight the
 * form is `aria-busy`, its controls are disabled and the global spinner shows;
 * further clicks/changes are ignored. The busy state resets on `pageshow`
 * (bfcache restore) and on `htmx:afterRequest` (failed request); focus returns
 * to the changed control once the fresh region is swapped in. Delegated on
 * `document`, so a set-all row injected after initialization still works.
 * @param {import('./spinner-module.js').Spinner} [spinner] global spinner to show while saving
 */
export function initVoteForm(spinner) {
  const voteTypes = ['Yes', 'No', 'IfNecessary'];
  const voteControls = 'button[data-set-all], .vote-radio-group input[type="radio"]';
  // ponytail: one in-flight save and one debounce timer for the page's single
  // vote form; keyed by form so a re-rendered form is never born busy.
  let pendingForms = new WeakSet();
  let timer = null;

  const resetForm = (form) => {
    pendingForms.delete(form);
    form.removeAttribute('aria-busy');
    form.querySelectorAll(voteControls)
      .forEach((control) => {
        control.disabled = false;
      });
  };

  window.addEventListener('pageshow', () => {
    clearTimeout(timer);
    timer = null;
    pendingForms = new WeakSet();
    document.querySelectorAll('form[aria-busy="true"]')
      .forEach((form) => resetForm(form));
    restoreVoteFocus();
  });

  // The vote POST swaps a fresh #vote-region through HTMX: focus the control
  // the Participant changed once it lands. A failed request swaps nothing, so
  // reset the busy state instead and leave the form usable.
  document.addEventListener('htmx:afterSwap', (event) => {
    const el = event.detail?.elt ?? event.target;
    if (el?.nodeType === 1 && el.id === 'vote-region') {
      restoreVoteFocus();
    }
  });

  document.addEventListener('htmx:afterRequest', (event) => {
    const form = event.target?.closest?.('form');
    if (form) resetForm(form);
  });

  // The single submit path both handlers share; it remembers the control the
  // Participant changed so the swap can put focus back on it.
  const submit = (form, focusTarget) => {
    if (pendingForms.has(form)) return;
    pendingForms.add(form);
    form.setAttribute('aria-busy', 'true');
    spinner?.show();
    rememberVoteFocus(focusTarget);
    // ponytail: requestSubmit() dispatches the submit event synchronously, so
    // HTMX captures the values before the controls are disabled below (a
    // disabled control is dropped from the next submission).
    form.requestSubmit();
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
 * Re-asserts the edit rail's sort radio group from the URL's `?sort` param.
 * The server already renders the matching `checked`, but Firefox restores form
 * controls from its own snapshot on reload (F5) after an HTMX swap + pushState
 * and can leave the whole radio group unchecked even though the grouping still
 * matches the URL. Re-applying the checked state keeps the visible selection in
 * sync. No-op when the rail (with fewer than two dates) is absent.
 * @param {string} [search] - query string to read `sort` from
 */
export function resyncSortRadios(search = window.location.search) {
  const group = document.querySelector('.sort-control');
  if (!group) return;
  const sort = new URLSearchParams(search).get('sort') === 'availability' ? 'availability' : 'date';
  group.querySelectorAll('input[name="sort"]')
    .forEach((radio) => {
      radio.checked = radio.value === sort;
    });
}

/**
 * Wires the sort-radio resync: once for the initial load (after Firefox's own
 * reload restore) and once per HTMX swap or history restore.
 */
export function initSortRadios() {
  resyncSortRadios();
  window.addEventListener('load', () => resyncSortRadios());
  window.addEventListener('pageshow', () => resyncSortRadios());
  document.addEventListener('htmx:load', () => resyncSortRadios());
  document.addEventListener('htmx:historyRestore', () => resyncSortRadios());
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

/**
 * Persists the open/closed state of every `details[data-persist-details]`
 * element in localStorage under the attribute's value (e.g. the role
 * instructions blocks on the organizer/opponent pages). State is read back on
 * init; the `toggle` event is captured on `document` because it does not
 * bubble. SSR renders the blocks open, so a first visit sees the guidance.
 */
export function initPersistedDetails() {
  function apply() {
    document.querySelectorAll('details[data-persist-details]')
      .forEach(function (details) {
        const stored = localStorage.getItem(details.dataset.persistDetails);
        if (stored !== null) {
          details.open = stored === 'true';
        }
      });
  }

  apply();

  document.addEventListener('toggle', function (e) {
    const details = e.target?.closest?.('details[data-persist-details]');
    if (!details) {
      return;
    }
    localStorage.setItem(details.dataset.persistDetails, String(details.open));
  }, true);

  // An OOB swap ships the SSR-open default; re-apply so a collapsed block
  // stays collapsed (e.g. the organizer instructions after a confirm swap).
  document.body.addEventListener('htmx:afterSwap', apply);
}

/* ------------------------------------------------------------------ */
/* Generator slate memory                                             */

/* ------------------------------------------------------------------ */

/**
 * Formats a 24h `{h, m}` into the locale's time token, mirroring the server's
 * `formatIsoToLocaleTokens` time portion: 24h locales `HH:mm`, 12h locales
 * `hh:mm aa` with a lowercase `am`/`pm` marker.
 * @param {number} h - hour of day (0–23)
 * @param {number} m - minute (0–59)
 * @param {boolean} clock24 - whether the locale is a 24-hour clock
 * @returns {string}
 */
export function toTimeToken(h, m, clock24) {
  const minute = String(m).padStart(2, '0');
  if (clock24) {
    return `${String(h).padStart(2, '0')}:${minute}`;
  }
  const hour12 = h % 12 || 12;
  const marker = h < 12 ? 'am' : 'pm';
  return `${String(hour12).padStart(2, '0')}:${minute} ${marker}`;
}

/**
 * Parses a user-typed time token into 24h `{h, m}`, mirroring the server's
 * `parseLocaleTimeOnly` grammar: 24h accepts `HH:mm` (optional seconds), 12h
 * requires `hh:mm aa` with a case-insensitive marker and performs the am/pm
 * normalisation. Returns undefined for empty, unparseable, or out-of-range
 * input (hour ≥ 24, minute ≥ 60) instead of throwing.
 * @param {string} value
 * @param {boolean} clock24
 * @returns {{h: number, m: number} | undefined}
 */
export function parseTimeToken(value, clock24) {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  const match = clock24
    ? /^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/.exec(trimmed)
    : /^(\d{1,2}):(\d{1,2})(?::\d{1,2})?\s*(am|pm)$/i.exec(trimmed);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59) return undefined;
  let h = hour;
  if (clock24) {
    if (h > 23) return undefined;
  } else {
    if (h < 1 || h > 12) return undefined;
    const isPm = match[3]?.toLowerCase() === 'pm';
    if (h === 12) {
      h = isPm ? 12 : 0;
    } else if (isPm) {
      h += 12;
    }
  }
  return {h, m: minute};
}

/**
 * Resolves whether the current locale uses a 24-hour clock from the same
 * `timeFormat` vocabulary the server's `localeConfig` uses (`HH:mm` vs
 * `hh:mm aa`). Falls back to 24h when the vendored locale bundle is absent.
 * @returns {boolean}
 */
function resolveClock24() {
  const locales = window.AirDatepickerLocale || {};
  const locale = locales[document.documentElement.lang] || locales['de-CH'];
  const timeFormat = (locale && locale.timeFormat) || 'HH:mm';
  return timeFormat.indexOf('aa') === -1;
}

/**
 * Reads the remembered generator slate (unversioned JSON `{venue, times}`)
 * under `key`. Best-effort: returns undefined on absent, unparseable, or
 * shape-mismatched storage (including a browser with localStorage disabled).
 * @param {string} key
 * @returns {{venue?: number, times?: Record<string, {h: number, m: number}>} | undefined}
 */
export function readGeneratorSlate(key) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  let slate;
  try {
    slate = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof slate !== 'object' || slate === null) return undefined;
  return slate;
}

/**
 * Writes the canonical slate (unversioned JSON) under `key`. Best-effort: a
 * browser with localStorage disabled (private mode) silences the write.
 * @param {string} key
 * @param {{venue?: number, times: Record<string, {h: number, m: number}>}} slate
 */
export function writeGeneratorSlate(key, slate) {
  try {
    localStorage.setItem(key, JSON.stringify(slate));
  } catch {
    // ponytail: private mode / storage disabled — no memory, no error.
  }
}

/**
 * Prefills one generator form from its remembered slate: empty time rows only
 * (so the server's authoritative `extras.times` echo always wins on an error
 * re-render), and the venue only when the stored number is still a selectable
 * option. A cleared grid (no stored `times`) leaves every row empty.
 * @param {HTMLFormElement} form
 */
function prefillGeneratorForm(form) {
  const key = form.dataset.generatorMemoryKey;
  if (!key) return;
  const slate = readGeneratorSlate(key);
  if (!slate) return;
  const clock24 = resolveClock24();
  const times = slate.times;
  if (times && typeof times === 'object') {
    form.querySelectorAll('input[name="time[]"]')
      .forEach((input, index) => {
        if (input.value !== '') return;
        const stored = times[String(index)];
        if (stored && typeof stored.h === 'number' && typeof stored.m === 'number') {
          input.value = toTimeToken(stored.h, stored.m, clock24);
        }
      });
  }
  if (typeof slate.venue === 'number') {
    const select = form.querySelector('#generateVenueNumber');
    if (!select) return;
    const option = Array.from(select.options).find((o) => Number(o.value) === slate.venue);
    if (option) select.value = option.value;
  }
}

/**
 * Wires the generator "slate memory": a delegated submit listener that
 * canonicalises the `time[]` rows plus the venue and saves them on every
 * generator submit (including failed validation), and a prefill pass run on
 * initial load and re-run after every HTMX settle. Scoped to
 * `form[data-generator-memory-key]`, so the memory is inert when the organizer
 * team has no click-tt identity.
 */
export function initGeneratorMemory() {
  const prefillAll = () => {
    document.querySelectorAll('form[data-generator-memory-key]')
      .forEach((form) => prefillGeneratorForm(form));
  };

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-generator-memory-key')) return;
    const key = form.dataset.generatorMemoryKey;
    if (!key) return;
    const clock24 = resolveClock24();
    const times = {};
    form.querySelectorAll('input[name="time[]"]')
      .forEach((input, index) => {
        const parsed = parseTimeToken(input.value, clock24);
        if (parsed) times[String(index)] = parsed;
      });
    const slate = {times};
    const select = form.querySelector('#generateVenueNumber');
    if (select && select.selectedIndex > 0) {
      slate.venue = Number(select.value);
    }
    writeGeneratorSlate(key, slate);
  });

  prefillAll();
  document.addEventListener('htmx:afterSettle', prefillAll);
}
