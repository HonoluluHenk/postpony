# 01 — Decorative icons hidden from the accessibility tree

**What to build:** On the owner edit page and the HTMX partials that swap into it, the decorative Material icon glyphs (the content-copy glyphs on the copy-to-clipboard buttons, the person glyphs in both team player lists, and the event glyphs in the proposed-date list) are hidden from the accessibility tree. Screen-reader users hear only the localized copy label and the player/date names; the copy buttons' accessible name is exactly the localized copy label.

**Blocked by:** None — can start immediately.

**Status:** done

- [ ] Every decorative Material icon on the edit page (including its partial renders) carries `aria-hidden="true"`; no bare icon exposes its glyph text.
- [ ] The copy-to-clipboard buttons' accessible name is exactly the localized copy label.
- [ ] Icons that already carry `aria-hidden` are unchanged.
- [ ] No visible layout, keyboard, or focus change to the buttons, lists, or forms.
- [ ] Existing axe accessibility e2e checks on the edit page still pass.
