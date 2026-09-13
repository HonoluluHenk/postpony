# Prototype Verdict — Edit page redesign

**Question settled:** Does a week-grouped date rail with inline per-player vote dots, a single Plex type family and a sticky desktop sidebar beat the current layout?

**Answer: Yes.** Variant A is the stronger direction and should be the basis of the real redesign. The combination that wins is specifically **week-grouped rail + sticky sidebar + inline vote dots + single Plex family**. The current layout's worst problem — the page running to ~28,000px because every Proposed Date appears four times (card, own-team Votes, home tally, away tally) — is gone in both variants, and A is the cleanest expression of the replacement.

Screenshots: `prototype-screenshots/a-{390,820,1282}.png`, `b-{390,820,1282}.png` (feature worktree, not committed on the proto branch).

## What was built

Two structurally-different renderings of the existing `/edit/:id` route, switched by `?proto=a|b` (plus a floating bottom bar, gated on `NODE_ENV` so it can't ship):

- **Variant A — Week rail.** Dates grouped by ISO week with dividers; desktop has a sticky sidebar (status, invitation links, roster, generator) beside the rail; phone stacks the rail first and the sidebar below. Votes render as one dot per own-team player per date, replacing all three vote tables. Single-line header, condensed tabular date column, left-aligned throughout.
- **Variant B — Dense list.** No sidebar, no week grouping: a flat chronological list where every date is one compact row, with the meta (status, invites, roster, generator) in a single top block that scrolls away. Same data, same dots, deliberately different hierarchy.

Both are read-only (buttons are inert), use the same cool-paper / light-line / near-black-ink palette with the existing indigo/error/warning tokens (no new accent), and self-host IBM Plex Sans (body) + Plex Sans Condensed (dates, tabular numerals) from `vendor/fonts/` with the OFL file.

## Why A wins

1. **Week grouping is the biggest single win.** A season's worth of dates becomes ~3 sections instead of a wall. At 1282px the six dates read as three obvious clusters; at 820px it still reads cleanly.
2. **Inline dots kill the four-times repetition.** Replacing the own-team Votes table plus the home/away tallies with per-player dots collapses the page dramatically while keeping the same information. The `1/4 voted` count carries the "who's done" signal the tables gave.
3. **Sticky sidebar keeps the always-reach actions in view.** Status, invites, roster and generator are pinned while you scroll the rail — genuinely better than B, where the meta scrolls out of view.
4. **Single Plex family + condensed tabular dates reads as one coherent system**, and the near-black ink on cool paper is calmer than the current surface.

## What B does better (steal from it)

- **The dense row.** B's flat row (date, chips, dots, actions in one line, no card chrome) is tighter than A's date cell, which wraps a bit awkwardly on phone (`2026` drops to its own line). A dense row style is worth folding into A's week sections.
- **Meta on top for narrow screens.** On phone B keeps the roster/generator out of the main scroll path better than A, where the stacked sidebar pushes the generator to the very bottom.

## Caveats / follow-ups before shipping

- **Phone roster/generator should be collapsed disclosures.** In A they render fully expanded below the rail, which makes the phone page long — the spec's intent. A real redesign should fold them into `<details>` on phone.
- **The switcher overlaps content mid-scroll** (expected — it's a prototype tool; it's hidden in prod).
- **`Copy to clipboard` as full text** is verbose in B; use the icon-only button from the current page.
- **Clash/occupancy chips**: both variants keep the clean-row chips; confirm the chip set on a row with actual clashes before shipping (the prototype data had clean rows).

## Shareable URLs (dev server, plain HTTP, port 3083)

- `http://localhost:3083/edit/26e388a1-7af3-4a91-b5f5-9733fda191be?proto=a`
- `http://localhost:3083/edit/26e388a1-7af3-4a91-b5f5-9733fda191be?proto=b`

The session is fixture-seeded with six Proposed Dates across three ISO weeks, a roster, and one voted player, so the rail, dots and sidebar all have real data.

## Prototype source

All prototype code lives on the throwaway branch `proto/edit-redesign` (never merged). Commits:
`89eef2d` fonts · `76b8f1d` palette/layout CSS · `511704c` switcher JS · `3b60137` variants · `b297a17` route wiring + assets.
