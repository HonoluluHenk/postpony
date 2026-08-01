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

  if (queryLang && (queryLang === 'en' || queryLang === 'de')) {
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

  // Update localStorage whenever a language link is clicked
  document.querySelectorAll('a[href*="lang="]').forEach(link => {
    link.addEventListener('click', () => {
      const url = new URL(link.href, window.location.origin);
      const lang = url.searchParams.get('lang');
      if (lang) {
        localStorage.setItem('lang', lang);
      }
    });
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
 * Progressively enhances the proposed-date input with air-datepicker on
 * fine-pointer (desktop) devices. Touch devices keep the native
 * datetime-local picker, which is better UX and a11y on mobile.
 * The input emits YYYY-MM-DD HH:mm (space separator); the server accepts
 * both T and space forms and normalizes to T on save.
 */
function initProposedDateTimePicker() {
  const input = document.getElementById('proposedDateTime');
  if (!input || typeof AirDatepicker === 'undefined') return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  if (activeDatePicker) {
    activeDatePicker.destroy();
  }
  input.type = 'text';

  const locales = window.AirDatepickerLocale || {};
  const locale = locales[document.documentElement.lang] || locales.en;
  activeDatePicker = new AirDatepicker(input, {
    locale: locale,
    // ponytail: air-datepicker's format tokenizer treats 'T' as a literal
    // (not a token boundary), so the separator must be a space; the server
    // accepts both and normalizes to 'T' on save.
    dateFormat: 'yyyy-MM-dd',
    timeFormat: 'HH:mm',
    dateTimeSeparator: ' ',
    timepicker: true,
    // ponytail: popup opens above the field so it never covers the
    // "Add Proposed Date" submit button that sits directly below the input.
    position: 'top center',
    selectedDates: input.value ? [input.value] : [],
    onShow: patchTimeSliderLabels,
  });
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
  initFocusManagement();
  initProposedDateTimePicker();
});
