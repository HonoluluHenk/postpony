/**
 * Spinner class to handle global loading overlay.
 */
class Spinner {
  constructor() {
    this.spinner = document.getElementById('global-spinner');
    this.init();
  }

  #activeClass = 'is-active';
  #loadingClass = 'is-loading';

  /**
   * Shows the global loading spinner overlay.
   */
  show() {
    if (!this.spinner) {
      return;
    }

    this.spinner.classList.add(this.#activeClass);
    this.spinner.setAttribute('aria-hidden', 'false');
    this.spinner.setAttribute('aria-busy', 'true');
    document.body.classList.add(this.#loadingClass);
  }

  /**
   * Hides the global loading spinner overlay.
   */
  hide() {
    if (!this.spinner) {
      return;
    }

    this.spinner.classList.remove('is-active');
    this.spinner.setAttribute('aria-hidden', 'true');
    this.spinner.removeAttribute('aria-busy');
    document.body.classList.remove('is-loading');
  }

  /**
   * Shows the spinner for non-HTMX button/form actions (regular navigations and submissions).
   */
  #initActionSpinner() {
    document.addEventListener('submit', (evt) => {
      const form = evt.target;
      if (form && form.hasAttribute && form.hasAttribute('data-no-spinner')) {
        return;
      }
      // HTMX form submissions are handled via htmx:beforeRequest.
      if (form && (form.hasAttribute('hx-post') || form.hasAttribute('hx-get') ||
        form.hasAttribute('hx-put') || form.hasAttribute('hx-delete') ||
        form.hasAttribute('hx-patch'))) {
        return;
      }
      this.show();
    });

    document.addEventListener('click', (evt) => {
      const target = evt.target.closest && evt.target.closest('a.button, button');
      if (!target) {
        return;
      }
      if (target.hasAttribute('data-no-spinner')) {
        return;
      }
      // HTMX-driven elements are handled via htmx:beforeRequest.
      if (target.hasAttribute('hx-get') || target.hasAttribute('hx-post') ||
        target.hasAttribute('hx-put') || target.hasAttribute('hx-delete') ||
        target.hasAttribute('hx-patch')) {
        return;
      }
      // Skip pure in-page anchors and buttons that don't navigate/submit.
      if (target.tagName === 'A') {
        const href = target.getAttribute('href');
        if (!href || href.startsWith('#') || target.getAttribute('target') === '_blank') {
          return;
        }
        this.show();
        return;
      }
      if (target.tagName === 'BUTTON') {
        const type = (target.getAttribute('type') || 'submit').toLowerCase();
        if (type === 'submit') {
          // Submit handler above will show the spinner.

        }
      }
    });

    // Ensure the spinner is hidden when navigating back via browser cache.
    window.addEventListener('pageshow', () => this.hide());
  }

  init() {
    this.#initActionSpinner();
  }
}

// Initialize globally if needed, or export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Spinner;
} else {
  window.Spinner = Spinner;
}
