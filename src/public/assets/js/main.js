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
  initProposedDateTimePicker
} from './ui.js';

// Delegated on document, so it needs no ready DOM. Wired here rather than in the
// load callback so a vote click that races the page's load event is never lost.
initVoteForm();

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
  initOccupancyTooltips();
  initProposedDateTimePicker();
  initGeneratorTimePickers();
  initGeneratorDatePickers();
});
