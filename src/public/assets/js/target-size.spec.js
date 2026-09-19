import {beforeAll, describe, expect, it} from 'vitest';
import beerCss from '../vendor/css/beer.min.css?raw';
import tokensCss from '../css/design-tokens.css?raw';
import styleCss from '../css/style.css?raw';

// WCAG 2.5.8 Target Size (Minimum): the click target is the whole wrapped
// label, so every radio/checkbox label must be at least 24x24 CSS px.
const MIN_TARGET_SIZE = 24;

// Mirror the real cascade (src/routes/layouts/main.tsx): BeerCSS is imported
// into `layer(vendor)`, then the design layer is declared and filled with the
// two project stylesheets. Replaying the layer order matters — an unlayered
// beer import would win over the design layer and shadow the computed rules
// this spec exists to check.
function injectAppStyles() {
  const style = document.createElement('style');
  style.textContent = [
    `@layer vendor {\n${beerCss}\n}`,
    '@layer design;',
    tokensCss,
    styleCss,
  ].join('\n');
  document.head.append(style);
}

function render(markup) {
  document.body.innerHTML = markup;
}

function rects(selector) {
  return Array.from(document.querySelectorAll(selector), (el) => el.getBoundingClientRect());
}

// `.num` and the count labels share the tabular-numerals + end-alignment
// convention. `end` is a logical keyword; Chromium reports it as `right` in an
// LTR document, so accept either physical or logical spelling.
function expectTabularEnd(selector) {
  const cells = document.querySelectorAll(selector);
  expect(cells.length).toBeGreaterThan(0);
  for (const cell of cells) {
    const style = getComputedStyle(cell);
    expect(style.fontVariantNumeric).toContain('tabular-nums');
    expect(['right', 'end']).toContain(style.textAlign);
  }
}

// Vote page choices (src/routes/join/vote.tsx): `.vote-option > label.radio`.
const VOTE_RADIO_GROUP = `
  <fieldset class="field border radio-group vote-radio-group">
    <div class="vote-option"><label class="radio"><input type="radio" name="vote-vote-date-1" value="Yes" checked><span>Yes</span></label></div>
    <div class="vote-option"><label class="radio"><input type="radio" name="vote-vote-date-1" value="IfNecessary"><span>If necessary</span></label></div>
    <div class="vote-option"><label class="radio"><input type="radio" name="vote-vote-date-1" value="No"><span>No</span></label></div>
  </fieldset>`;

// Edit rail (src/routes/partials/sort-control.tsx and
// src/routes/edit/id/proposed-dates-section.tsx): sort radios and the votable
// checkbox, all wrapped by their labels.
const EDIT_RAIL_CONTROLS = `
  <div class="sort-control" role="radiogroup" aria-label="Sort by">
    <span class="sort-label">Sort by</span>
    <label class="sort-option"><input type="radio" name="sort" value="date" checked><span>Date</span></label>
    <label class="sort-option"><input type="radio" name="sort" value="availability"><span>Availability</span></label>
  </div>
  <div class="date-actions">
    <label class="action action--votable" title="Allow voting"><input type="checkbox" checked>Votable</label>
  </div>`;

// Vote summary table (src/routes/partials/vote-tally.tsx) plus the edit-rail
// tallies and voted count.
const TALLIES = `
  <table>
    <thead><tr><th scope="col">Proposed Date &amp; Time</th><th scope="col" class="num">Yes</th></tr></thead>
    <tbody><tr><td>Fr, 5. Sept. 20:00</td><td class="num">3</td></tr></tbody>
  </table>
  <div class="team-tallies"><span class="team-tally">Thun: 3 (2/1/0)</span></div>
  <span class="vote-dot-count">2/3 voted</span>`;

beforeAll(injectAppStyles);

describe('target size (WCAG 2.5.8)', () => {
  it('gives every vote radio label at least a 24x24 click target', () => {
    render(VOTE_RADIO_GROUP);

    const boxes = rects('.vote-radio-group label');
    expect(boxes).toHaveLength(3);
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
      expect(box.height).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
    }
  });

  it('gives the edit-rail sort radios and votable toggle at least a 24x24 click target', () => {
    render(EDIT_RAIL_CONTROLS);

    for (const selector of ['.sort-option', '.action--votable']) {
      const boxes = rects(selector);
      expect(boxes.length).toBeGreaterThan(0);
      for (const box of boxes) {
        expect(box.width).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
        expect(box.height).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
      }
    }
  });
});

describe('numeric alignment', () => {
  it('sets vote tally cells to tabular, end-aligned numerals', () => {
    render(TALLIES);

    expectTabularEnd('.num');
  });

  it('sets team tallies and the voted count to tabular, end-aligned numerals', () => {
    render(TALLIES);

    expectTabularEnd('.team-tally');
    expectTabularEnd('.vote-dot-count');
  });
});
