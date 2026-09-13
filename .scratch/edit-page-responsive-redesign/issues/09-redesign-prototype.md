# 09: Redesign prototype on a throwaway branch

**What to build:** A UI prototype of the edit page redesign, switchable via a `proto` search param (`a` | `b`) with a floating bottom bar, forked from main after tickets 05–08 land. It answers: does a week-grouped date rail with inline per-player vote dots, a single Plex type family and a sticky desktop sidebar beat the current layout? Verdict is recorded in the spec's Comments. Follows the `prototype` skill (UI branch); never merged.

**Blocked by:** 05, 06, 07, 08

**Status:** ready-for-agent

- [ ] Branch `proto/edit-redesign` created from main; all prototype code lives there only
- [ ] `?proto=a|b` on the edit route switches variants; a floating bottom bar switches too
- [ ] IBM Plex Sans + Plex Sans Condensed self-hosted in the vendor fonts directory (OFL licence file included)
- [ ] Palette: cool paper background, light line colour, near-black ink, existing indigo/error/warning tokens; no new accent
- [ ] Proposed Dates grouped by ISO week with dividers; left-aligned; single-line header
- [ ] Desktop: sticky sidebar with status, invitation links, roster, generator; phone: stacked with votes and roster in disclosures
- [ ] Votes shown inline per Proposed Date as per-player dots
- [ ] Screenshots at 390/820/1282 for both variants attached to the spec Comments with the verdict and the question settled
- [ ] No tests, no persistence changes; main untouched
