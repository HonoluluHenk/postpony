/**
 * Initializes HTMX configuration and event listeners for the spinner.
 * @param {Spinner} spinner - The spinner instance.
 */
function initHtmx(spinner) {
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
      // ponytail: only swap if the response contains content outside of OOB elements to avoid clearing the target on global errors.
      const response = evt.detail.xhr.responseText;
      const doc = new DOMParser().parseFromString(response, 'text/html');
      const hasOob = doc.body.querySelector('[hx-swap-oob]') !== null;
      const nonOobContent = [...doc.body.children]
        .filter(el => !el.hasAttribute('hx-swap-oob'))
        .some(el => el.textContent.trim().length > 0);

      evt.detail.shouldSwap = nonOobContent || !hasOob;
      evt.detail.isError = false;
    }
  });
}

/**
 * Initializes the UI theme using BeerCSS.
 */
function initTheme() {
  if (typeof ui === 'function') {
    ui('theme', '#1a237e');
  }
}

/**
 * Handles language persistence using localStorage and URL parameters.
 */
function initLanguage() {
  const urlParams = new URLSearchParams(window.location.search);
  const queryLang = urlParams.get('lang');
  const supportedLocales = ['de-CH', 'fr-CH', 'it-CH', 'en-US'];

  if (queryLang && supportedLocales.includes(queryLang)) {
    localStorage.setItem('lang', queryLang);
  }

  const currentLang = document.documentElement.lang;

  // We removed the redirection from JS as the backend handles query parameters
  // and redirects to clean URLs. We still sync to localStorage for persistence
  // if cookies are cleared.

  const storedLang = localStorage.getItem('lang');
  if (storedLang && storedLang !== currentLang && !urlParams.has('lang')) {
    // Only redirect if there is no query param (to avoid infinite loops)
    // and if the backend didn't already set the correct language.
    // Actually, if the backend set it, currentLang would match storedLang.
    window.location.href = window.location.pathname + '?lang=' + storedLang;
  }

  // Update localStorage whenever the header language dropdown changes, so the
  // choice survives cookie-clearing (the form itself navigates via ?lang=).
  document.getElementById('language-select')?.addEventListener('change', (event) => {
    localStorage.setItem('lang', event.target.value);
  });
}

/**
 * Handles click-to-copy for [data-copy] buttons.
 */
function initClipboard() {
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
function initProposedDateTimePicker() {
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
function initDeleteDialogs() {
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-dialog]');
    if (!trigger) return;
    const dialog = document.getElementById(trigger.dataset.openDialog);
    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  });
}

/**
 * Focuses a heading inside the swap target, or the error alert when validation fails.
 * Called from hx-on::after-request on forms that trigger partial swaps.
 * @param {string} targetSelector - CSS selector for the swap target element
 */
function initFocusManagement() {
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
      var heading = el.querySelector('h2, h3, h4');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
      }
    }
  });
}

// main.js is loaded in <head> without defer, so the DOM (including #global-spinner)
// is not ready yet; construct the spinner once the page has loaded.
window.addEventListener('load', () => {
  const spinner = new Spinner();
  initTheme();
  initLanguage();
  initHtmx(spinner);
  initClipboard();
  initDeleteDialogs();
  initFocusManagement();
  initProposedDateTimePicker();
});
