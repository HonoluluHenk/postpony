# ADR 0021: Fixed Monday–Sunday Grid for the Proposed Dates Generator

## Status

Accepted

## Context

The generator on the edit page lets an organizer propose a weekly slate of candidate re-match slots in one step. The candidate slots become Proposed Dates inside the planning window, anchored on the Match's `originalMatchDateTime` and bounded 8 weeks back / 4 weeks forward (past dates dropped).

The overwhelming case is one candidate time per day across the week. The earlier free-form approach asked the organizer to build that slate row by row — add a row, pick a weekday, type a time, repeat. That row management is overhead for the dominant case, and a free-form row count invites slates that drift from the weekly rhythm.

## Decision

The generator renders a **fixed grid of exactly seven rows, one per weekday, Monday through Sunday**. Each row is a static weekday label (text, not a select) plus an empty time input. The organizer fills the time on the days they want proposed and clicks Generate; only rows with a filled time produce a Proposed Date, and empty rows are skipped.

- **Weekdays are locked.** A row cannot be re-assigned to a different weekday, so a day can never be mislabelled.
- **No row management.** There are no add-row / remove-row controls and no row-count state, so the grid cannot grow out of sync with the week.
- **Fill-to-generate.** Every time input starts empty by design; the organizer deliberately chooses which days to propose. The grid itself is the preset, and the organizer's per-day times are the input.
- **Server-side mapping.** The request carries the submitted `time[]` values only. The server maps `time[i]` to weekday `i+1` and never trusts a client-supplied weekday.

The pure generator module is unchanged: it keeps walking the planning window from `(weekday, hour, minute)` tuples, and empty-time filtering happens at the handler's parse boundary before tuples are built.

## Rationale

The one-candidate-per-day weekly rhythm is the dominant use. A fixed seven-row grid needs no setup, cannot grow out of sync with the week, and keeps the weekday labels locked so a day cannot be mislabelled. Because generation stays server-driven, no client-side row logic is required — the grid is server-rendered and its behaviour testable without a browser.

## Consequences

- The organizer's input on the grid is the time per day only; the weekday ordering is fixed.
- The server-side tuple cap remains as a pure security guard; the fixed seven-row form can never reach it, so the cap is no longer exercised by the UI.
- The generate form renders in every non-`Confirmed` state, matching the rest of the edit flow's lifecycle gating.

## Alternatives considered

- **Free-form rows with client-side row management** (add / remove / reorder rows). Rejected: row management is overhead for the common one-per-day case, and a free-form row count invites slates that drift from a weekly rhythm.
- **Pre-filled default times** (e.g. `20:00`). Rejected: times start empty by design, forcing a deliberate choice per day.
