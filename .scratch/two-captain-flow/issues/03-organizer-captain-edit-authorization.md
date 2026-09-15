# 03: Organizer-captain edit authorization

**What to build:** edit access requires the organizer-captain password, so merely knowing the session URL no longer grants control. This closes the pre-existing gap where edit routes never verified a password.

**Blocked by:** 02 — Per-team secrets, creation & join

**Status:** ready-for-agent

- [x] The edit GET and all edit POST commands verify the organizer-captain password against its hash.
- [x] A bare session URL, or a wrong password, is refused with a translated 403.
- [x] The iCal edit endpoint keeps its public-read behaviour explicit and does not require the captain password.
- [x] e2e covers the unauthenticated (403) path and the authenticated edit path.
