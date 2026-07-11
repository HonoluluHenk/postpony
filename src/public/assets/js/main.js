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
  document.addEventListener('htmx:beforeOnLoad', (evt) => {
    const status = evt.detail.xhr.status;
    if (status >= 400 && status < 600) {
      // ponytail: only swap if the response contains content outside of OOB elements to avoid clearing the target on global errors.
      const response = evt.detail.xhr.responseText;
      const hasOob = response.includes('hx-swap-oob');
      // Simple heuristic: if there's any non-OOB content, swap it.
      const nonOobContent = response.replace(/<div[^>]*hx-swap-oob="true"[^>]*>[\s\S]*?<\/div>/g, '').trim();

      evt.detail.shouldSwap = nonOobContent.length > 0 || !hasOob;
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

// Initialize immediately
const spinner = new Spinner();
window.addEventListener('load', () => {
  initTheme();
  initLanguage();
  initHtmx(spinner);
});
