# 02: Own-side clash chips on the opponent page

**What to build:** the Opponent Captain opens their share link and sees, under each votable Proposed Date, their own team's clash lines plus a "No other games" chip where their side is checked and clean. Dates render with weekday, day, time, and year, and each row announces itself as a clash or clean group to assistive technology. Nothing of the organizer team's schedule, no venue or occupancy chips, and no unchecked-state chip ever appear.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] A date clashing on the opponent side shows its clash lines with game time and opposing team, worded without any home/away side prefix, in both supported locales.
- [x] A date clean on the opponent side shows the clean chip; a date with no clash data shows no clash UI at all.
- [x] A date clashing on both sides shows exactly the opponent side's line on the opponent page while the edit page keeps showing both.
- [x] The organizer team's name and schedule appear nowhere on the opponent page.
- [x] Date rows carry the clash-row marker, the group role, and the clash/clean accessible labels judged on the opponent side only.
- [x] The shared accessibility checker passes on the opponent surface.
- [x] End-to-end coverage asserts the clash line, the clean chip, and the continued absence of organizer-side information.
