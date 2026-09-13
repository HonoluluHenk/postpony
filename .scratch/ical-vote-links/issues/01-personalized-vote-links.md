# 01: Personalized one-click Vote links in the join export

**What to build:** A Participant downloading the calendar from the voting poll or the confirmed-info page gets a personalized file: each Proposed Date's event carries three one-click Vote links — `Yes`, `IfNecessary`, `No`, labelled in the export's locale — plus a `URL:` property pointing at the voting page. Every embedded link repeats the invitation token and the Participant's id, so a click can act directly. A file fetched with no or a foreign identity degrades silently to an unpersonalized calendar whose links carry no identity.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Each VEVENT's `DESCRIPTION` carries three choice links for its Proposed Date (`vote-<dateId>=Yes|IfNecessary|No`), each URL-escaped and RFC 5545 line-folded, each carrying the invitation token
- [x] The `URL:` property points at the voting page (`/join/:id/:team/vote` with token); it carries the Participant id when the export is personalized
- [x] Clickable labels come from the export locale (reuse `vote_yes`/`vote_no`/`vote_if_necessary`; one new action-label key synced across `en.json`/`de.json`), threaded into the builder as strings rather than resolved inside it
- [x] The join export accepts an optional `playerId`; a Participant id matching that team embeds itself in every link, a missing or mismatched one yields an unpersonalized file (no error)
- [x] The "Export as calendar" links on the voting poll and the confirmed-info steps append the current Participant's id
- [x] The edit-page export is byte-identical to today (no Vote links, no `URL:` change)

**Tested via:** builder unit suite (links, `URL:`, personalization on/off, escaping/folding, labels-as-given) and handler suite (playerId pass-through and silent degrade, both steps of the join page echo the personalized link).

## Comments

Done 2026-09-13. Commits: b21f45b (locale key), 7b9af06 (builder links + URL:), 4b32698 (handler + join-step export links), 7ab4578 (builder/handler tests), eb96506 (edit-export guard), a63bf89 (review). Gates: lint green, 693 tests passed, coverage 90 / 82 / 93 / 90. Review approved, no fixes.