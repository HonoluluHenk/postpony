import {Spinner} from './spinner-module.js';
import {
  initTheme,
  initLanguage,
  initHtmx,
  initClipboard,
  initDeleteDialogs,
  initFocusManagement,
  initOccupancyTooltips,
  initVoteForm,
  initGeneratorTimePickers,
  initGeneratorDatePickers,
  initProposedDateTimePicker,
  initRedesignDisclosures
} from './ui.js';

// The Spinner only registers listeners in its constructor and reads
// #global-spinner lazily, so it is safe to build before the DOM is ready. One
// instance is shared: initVoteForm shows it for a vote submit, initHtmx for
// HTMX requests.
const spinner = new Spinner();

// Delegated on document, so it needs no ready DOM. Wired here rather than in the
// load callback so a vote click that races the page's load event is never lost.
initVoteForm(spinner);

window.addEventListener('load', () => {
  initTheme();
  initLanguage();
  initHtmx(spinner);
  initClipboard();
  initDeleteDialogs();
  initFocusManagement();
  initOccupancyTooltips();
  initProposedDateTimePicker();
  initGeneratorTimePickers();
  initGeneratorDatePickers();
  initRedesignDisclosures();
});
