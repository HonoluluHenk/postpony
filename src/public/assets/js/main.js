import {Spinner} from './spinner-module.js';
import {
  initTheme,
  initLanguage,
  initHtmx,
  initClipboard,
  initDeleteDialogs,
  initFocusManagement,
  initOccupancyTooltips,
  initProposedDateTimePicker
} from './ui.js';

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
});
