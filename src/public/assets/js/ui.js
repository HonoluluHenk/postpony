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

  document.getElementById('language-select')?.addEventListener('change', (event) => {
    localStorage.setItem('lang', event.target.value);
  });
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
 * Handles click-to-copy for [data-copy] buttons.
 */
export function initClipboard() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    navigator.clipboard.writeText(btn.dataset.copy);
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

// ponytail: single proposed-date picker per page; destroyed and recreated on
// every HTMX swap so the fresh input always gets a live instance.
let activeDatePicker = null;

/**
 * Progressively enhances the proposed-date input with air-datepicker on every
 * device. The picker is opened only via the explicit calendar button, never on
 * focus (the input is a plain text field the server parses tolerantly). The
 * picker writes the locale's token format, which matches the input placeholder
 * and the server grammar, e.g. `02.08.2026 20:00` or `08/02/2026 08:00 pm`.
 */
export function initProposedDateTimePicker() {
  const input = document.getElementById('proposedDateTime');
  if (!input || typeof AirDatepicker === 'undefined') return;

  const locales = window.AirDatepickerLocale || {};
  const locale = locales[document.documentElement.lang] || locales['de-CH'];
  if (!locale) return;

  if (activeDatePicker) {
    activeDatePicker.destroy();
  }

  const options = {
    locale: locale,
    dateFormat: locale.dateFormat,
    timeFormat: locale.timeFormat,
    dateTimeSeparator: ' ',
    timepicker: true,
    // Only quarter-hour proposals are offered; free-text typing of any minute
    // stays untouched (the server grammar stays tolerant). hoursStep keeps the
    // vendor default of 1.
    minutesStep: 15,
    // ponytail: a never-fired event keeps the picker closed until the explicit
    // button calls show(); `''` would also work but the string event is clearer.
    showEvent: 'adp-never-fire',
    position: 'top center',
    onShow: patchTimeSliderLabels,
  };

  try {
    activeDatePicker = new AirDatepicker(input, {
      ...options,
      selectedDates: input.value ? [input.value] : [],
    });
  } catch {
    // ponytail: an unparseable echoed value (validation error) must not kill
    // the picker; retry without a selection so it still opens for picking.
    activeDatePicker = new AirDatepicker(input, {...options, selectedDates: []});
  }

  const button = document.getElementById('proposedDateTimePicker');
  if (button) {
    button.onclick = (e) => {
      e.preventDefault();
      activeDatePicker?.show();
    };
  }
}

// ponytail: air-datepicker ships no ARIA labels on its time sliders; patch
// them with localized names so axe (and screen readers) see labelled fields.
// The picker builds its DOM lazily on first show, hence this runs per open.
function patchTimeSliderLabels() {
  if (!activeDatePicker) return;
  const locale = activeDatePicker.opts.locale;
  const sliderLabels = [locale.hours, locale.minutes];
  activeDatePicker.$datepicker.querySelectorAll('input[type="range"]')
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

/**
 * Focuses a heading inside the swap target, or the error alert when validation fails.
 * Called from hx-on::after-request on forms that trigger partial swaps.
 */
export function initFocusManagement() {
  document.addEventListener('htmx:afterSettle', function (evt) {
    var el = evt.target;
    if (!el || el.nodeType !== 1) return;

    initProposedDateTimePicker();

    if (el.matches('#main-content')) {
      var h = el.querySelector('h2, h3, h4');
      if (h) {
        h.setAttribute('tabindex', '-1');
        h.focus();
      }
      return;
    }

    if (el.matches('#team-management, #venue-management, #proposed-dates-management')) {
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
