# 01: Edit rail: accessible per-row control names carry the date

**What to build:** every per-row control on the organizer's proposed-dates list — Delete, the Votable toggle, and Confirm Date — is announced to a screenreader together with its date, so repeated rows are distinguishable instead of hearing the same bare "Delete"/"Votable"/"Confirm" N times. A small shared composing step (used again by later tickets) builds the "control · date" accessible name from the row's existing display string, in English and German; fr-CH/it-CH reuse English per ADR-0016.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Each Delete, Votable-toggle, and Confirm Date control on a row announces its control name plus the row's date; two rows never share an indistinguishable accessible name.
- [ ] The accessible name uses the row's existing display wording, so what a screenreader hears matches the visible card.
- [ ] The labels exist in en and de; the composing step is shared and reusable rather than per-control.
- [ ] The edit surface passes the axe/`checkA11y` pass with no critical or serious issues, and the render spec asserts the per-row accessible names behaviourally (not by selector).