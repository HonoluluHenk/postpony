# 01: Single Proposed Date picker steps in 15-minute increments

**What to build:** The main Proposed Date picker (opened via the calendar button next to the proposed-date-time field) only advances time in 15-minute increments: the minute slider jumps 0/15/30/45, the hour slider keeps 1-hour steps, and the picker writes a quarter-hour-aligned time into the field. Free-text entry and the tolerant server grammar are untouched — typing any minute still submits, exactly as before.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Minute slider of the Proposed Date picker steps in 15-minute increments (0/15/30/45); hour slider keeps 1-hour steps.
- [x] Free-text typing and server-side parsing are unchanged: any minute 00–59 still validates.
- [x] Picker still opens only via the calendar button (never on focus) and stays live after an HTMX partial swap.
- [x] Browser unit test asserts `minutesStep: 15` on the picker constructor via a recording `AirDatepicker` fake.
- [x] E2E asserts the minute slider moves 15 minutes per step and the a11y scan still passes.
- [x] Existing date/time parsing and edit-handler tests remain green.

## Comments

- Implementation: `c5e41cb`
- Review: `5f08961`

Single Proposed Date picker now passes `minutesStep: 15` (hour step left at vendor default 1); free text and server parsing unchanged. Browser unit tests assert the option/rebind/button-open behavior via a recording AirDatepicker fake; e2e asserts rendered minute/hour slider steps and stays-live-after-HTMX-swap.