# 05: Update the CSS architecture docs

**What to build:** Bring the CSS documentation in line with the consolidated reality. The `css-styling` skill should describe the actual file set (two stylesheets plus the token layer; the prototype stylesheet gone), list the new token catalog entries, and drop stale references — including the template-engine file that no longer exists. Update `CONTEXT.md` if it names the CSS files. The docs must match the implementation rather than describe an aspiration.

**Blocked by:** 04

**Status:** done

- [x] The skill documents the real file set and the new token catalog.
- [x] No stale file or template-engine references remain in the skill or `CONTEXT.md`.
- [x] `npm run lint` passes (docs changes do not affect the app build).

## Comments

Commits: `9a90733` (ticket done — skill file set + token catalog, `main.eta`→`main.tsx`, ticket ticked), `7828dfa` (review), `eb7dd47` (review-fixed — unlayered `@font-face` attribution, dropped deleted-filename prose). `npm run lint` clean. `CONTEXT.md` needed no change (names no CSS files).
