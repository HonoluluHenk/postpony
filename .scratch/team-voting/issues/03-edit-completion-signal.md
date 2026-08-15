# 03 — Edit view: own-team completion signal

**What to build:** the organizer can see how far their own team's voting has progressed, per date, without relying on guesswork. The edit view's own-team (organizer-team) section shows per-player votes by name — one row per player per proposed date, showing the vote type or "no vote" — plus, for each date, an "N/M voted" count and a list of who has not voted yet (never-joined players marked "not joined"). The denominator M is all organizer-team players: the scraped roster plus any new names, joined or not; the organizer is a roster player and counts in M but never casts a ballot from this view. The opponent section stays tallies-only (no per-player names). The per-date "allow opponent to vote" switch is relabelled for the general flag (`votableByOpponent`) — a pure access toggle, no threshold. Any element the partial renders must also exist in the initial template. New locale keys: per-team results heading, "N/M voted", "not joined", and the relabelled toggle.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Edit view shows the organizer team's per-player votes by name per date (vote type or "no vote").
- [ ] Each date shows an "N/M voted" count whose denominator is all organizer-team players (roster + new names, joined or not).
- [ ] A non-voter list per date marks never-joined players as "not joined".
- [ ] Opponent section shows tallies only; organizer team's per-player names are never shown for the opponent side.
- [ ] Propose-to-opponent toggle relabelled; behavior unchanged (pure access toggle).
- [ ] Partial and initial render stay in sync for the new sections.
- [ ] Unit tests cover count denominator and never-joined marking in the view data.
- [ ] e2e: organizer-team member votes via the own-team link; edit view reflects per-player votes and the updated "N/M voted" count.