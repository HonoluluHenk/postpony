/**
 * @param {Element} el
 * @returns {boolean} Whether the element is driven by HTMX (has any hx-* method attribute).
 */
export function isHtmxDriven(el) {
  return el.hasAttribute('hx-get') || el.hasAttribute('hx-post') ||
    el.hasAttribute('hx-put') || el.hasAttribute('hx-delete') ||
    el.hasAttribute('hx-patch');
}

/**
 * @param {Element} el - A submit button/form or a clicked link/button.
 * @returns {boolean} Whether a spinner should be shown for this element.
 */
export function shouldShowSpinner(el) {
  if (el.hasAttribute('data-no-spinner')) return false;
  if (isHtmxDriven(el)) return false;
  // ponytail: htmx drives submit buttons inside hx-* forms via its own request
  // events; don't double-show the global spinner (the Delete-proposed-date form).
  if (el.closest?.('form[hx-get], form[hx-post], form[hx-put], form[hx-delete], form[hx-patch]')) {
    return false;
  }
  // A type="button" never navigates or submits (dialog dismiss, date picker
  // toggles, etc.), so it must not spin a global loading overlay that then
  // hangs forever waiting for a page load.
  if (el.tagName === 'BUTTON' && el.type === 'button') return false;
  if (el.tagName === 'A') {
    const href = el.getAttribute('href');
    if (!href || href.startsWith('#') || el.getAttribute('target') === '_blank') return false;
  }
  return true;
}

/**
 * Spinner class to handle global loading overlay.
 */
export class Spinner {
  /** @returns {HTMLElement | null} */
  get spinner() {
    return document.getElementById('global-spinner');
  }

  constructor() {
    this.init();
  }

  #activeClass = 'is-active';
  #loadingClass = 'is-loading';

  /**
   * Shows the global loading spinner overlay.
   */
  show() {
    const spinner = this.spinner;

    spinner?.classList.add(this.#activeClass);
    spinner?.setAttribute('aria-hidden', 'false');
    spinner?.setAttribute('aria-busy', 'true');
    document.body.classList.add(this.#loadingClass);
  }

  /**
   * Hides the global loading spinner overlay.
   */
  hide() {
    const spinner = this.spinner;

    spinner?.classList.remove(this.#activeClass);
    spinner?.setAttribute('aria-hidden', 'true');
    spinner?.removeAttribute('aria-busy');
    document.body.classList.remove(this.#loadingClass);
  }

  /**
   * Shows the spinner for non-HTMX button/form actions (regular navigations and submissions).
   */
  #initActionSpinner() {
    document.addEventListener('submit', (evt) => {
      const form = evt.target;
      if (!form || !form.hasAttribute) return;
      if (!shouldShowSpinner(form)) return;
      this.show();
    });

    document.addEventListener('click', (evt) => {
      const target = evt.target.closest && evt.target.closest('a.button, button');
      if (!target) return;
      if (!shouldShowSpinner(target)) return;
      this.show();
    });

    // Ensure the spinner is hidden when navigating back via browser cache.
    window.addEventListener('pageshow', () => this.hide());
  }

  init() {
    this.#initActionSpinner();
  }
}
