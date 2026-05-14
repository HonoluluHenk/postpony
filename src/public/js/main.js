/**
 * Initializes HTMX configuration and event listeners.
 */
function initHtmx() {
  if (typeof htmx === 'undefined') {
    return;
  }

  htmx.config.defaultSwapStyle = 'outerHTML';
  document.addEventListener('htmx:beforeOnLoad', function (evt) {
    if (evt.detail.xhr.status === 400) {
      evt.detail.shouldSwap = true;
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

  const storedLang = localStorage.getItem('lang');
  const currentLang = document.documentElement.lang;

  if (storedLang && storedLang !== currentLang) {
    // If we have a stored language and it's different from the current one,
    // redirect to set the cookie unless we are already on the language switch route
    if (window.location.pathname !== '/lang') {
      window.location.href = '/lang?lang=' + storedLang;
    }
  }

  // Update localStorage whenever a language link is clicked
  document.querySelectorAll('a[href^="/lang?lang="]').forEach(link => {
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
initHtmx();

window.addEventListener('load', () => {
  initTheme();
  initLanguage();
});
