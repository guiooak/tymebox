# Timebox Works — Next-Version Feature Enhancements Brainstorm

## Context

This is the functional/behavioral half of the next-version brainstorm —
what the app *does*, not how it looks. (For palette, motion, layout, and
branding, see the companion doc:
`2026-07-31-02-next-version-ui-enhancements.md`.) It gap-checks the current
Home / Events History / Event Dashboard / Report pages against the stated
requirements and captures ideas for closing those gaps plus new
capabilities. The single highest-priority thread here: reworking the
creation flow into a true Trello-like "title + description first, fill in
the rest on the board" experience, per requirement 7.

> **Status (2026-08-01):** this document was written as an ideas list, and has
> since been implemented on `feat/next-version-feature-enhancements`. The gap
> table below is updated to the post-implementation state. The two items that
> need infrastructure this app doesn't have — email send and shareable links —
> are scoped instead in `2026-08-01-01-report-delivery-scoping.md`.

---

## Gap check against the written requirements

| Requirement | State | Note |
|---|---|---|
| Landing: last 5 meetings | ✅ Done | `useMeetingMetrics` caps `recent` at 5 |
| Landing: Create New event button | ✅ Done | `Home.tsx` header |
| Landing: Events log button | ✅ Done | "View all history" CTA in the header plus a per-section "View all" |
| History: list all events | ✅ Done | Every status listed, with chips, status tabs, search and sort |
| History: reopen into Dashboard | ✅ Done | "Open dashboard" per row (`reopenInDashboard`), separate from "View report" |
| History: reopen into Report | ✅ Done | "View report", disabled for events that never finished |
| Dashboard: agenda/milestones list | ✅ Done | `GoalsDecisionCollector` |
| Dashboard: per-milestone notes | ✅ Done | `decisions` textarea per goal |
| Dashboard: countdown w/ time left | ✅ Done | `TimeCountdown` |
| Dashboard: countdown color thresholds | ✅ Done | primary → warning (tendency crossover) → danger (overdue) |
| Dashboard: burndown w/ tendency + reality | ✅ Done | `BurndownChart` (tendency, progress, projection) |
| Dashboard: parking lot | ✅ Done | `DashboardSideTopics` + `PostIt` |
| Dashboard: form has only Title + Description upfront | ✅ Done | `MeetingForm` is one input, one textarea, one "Create event" button |
| Dashboard: everything editable anytime | ✅ Done | Title, description, schedule and milestones are all click-to-edit on the board |
| Report: title/description | ✅ Done | |
| Report: milestones + notes + resolved time | ✅ Done | |
| Report: burndown snapshot | ✅ Done | |
| Report: parking lot | ✅ Done | |
| Report: performance cards w/ color | ✅ Done | `TimeCardsGrid` + `timeDisplayFeedbackRules` |
| Report: send by email | ❌ Not built (needs a backend) | Scoped in `2026-08-01-01-report-delivery-scoping.md`; "Copy report", "Download chart" and "Print / PDF" ship instead |

---

## Priority — Rework the creation flow into a true Trello-like flow

Today `MeetingForm.tsx` asks for **name, start time, end time, and ≥1 goal**
before the dashboard even opens — that's four decisions before the user sees
anything, which fights the "get in fast, fill in as you go" feeling the
requirement is going for.

Ideas:
- **Shrink the entry form to Title + Description only.** One field, one
  textarea, one big "Create" button — closer to Trello's "just name the
  board" moment. Everything else (start/end time, goals/milestones, weights)
  becomes an in-dashboard action.
- **Model the dashboard like a Trello board setup state.** Before the event
  is started, show the goals list as an empty, inviting list with a
  persistent "+ Add milestone" affordance (à la Trello's "+ Add a card"),
  rather than a modal form. Same treatment for setting start/end time — an
  inline, click-to-edit time chip near the countdown rather than a separate
  step.
- **Let start/end time be optional until "Start event."** The countdown can
  show a soft "not scheduled yet" state; forcing a real start/end only when
  the user hits "Start" keeps early friction near zero and matches
  requirement 8 (editable anytime) more literally, since time becomes just
  another editable field on the dashboard instead of a one-time form input.
- **Inline goal add/reorder/remove directly in `GoalsDecisionCollector`,**
  not just the pre-event `FormInputsList`. Drag-to-reorder would also read
  as very Trello. Removing a goal mid-event should be as frictionless as
  adding one.
- **Progressive disclosure for weights.** Most events probably don't need
  weighted goals — keep weight hidden behind a small "advanced" toggle per
  goal instead of a column always in view (it's already conditionally shown
  in the report, so the pattern exists — bring it forward into the editing
  UI too).
- **Per-goal overflow menu (⋮) with Edit / Delete / Duplicate (confirmed).**
  Each row in `GoalsDecisionCollector` gets a vertical-ellipsis menu next to
  the checkbox/title:
  - **Edit** opens a small modal (reusing `useDialog`/`Modal`) with two
    fields: the goal's **completed-at time** (via `FormDatetimePicker`,
    editable even after the box is checked) and its **weight** (a number
    input) — folding the completion-time-correction idea and weight editing
    into one lightweight form instead of two separate mechanisms.
  - **Delete** removes the goal (with the same confirm-if-non-empty pattern
    already used in `DashboardSideTopics`' `onDelete`).
  - **Duplicate** clones the goal (fresh id, name copied, weight copied,
    `finishedAt`/`decisions` reset) — useful for near-identical recurring
    milestones.
  - This menu is the more future-proof pick over a bare inline edit precisely
    *because* it now hosts three actions, not one.
- **Inline, click-to-edit title and description on the dashboard
  (confirmed).** Click the heading/paragraph to turn it into an
  input/textarea in place, no separate edit form, matching how goal notes
  and side topics already behave. Same treatment should extend to
  start/end time, supporting requirement 8 literally.

## Landing page — feature ideas

Current: header + resume-in-progress banner + 4 metric tiles + recent-5 list.

- **Explicit "View all history" CTA** on the page itself (closes the gap
  above — right now it's sidebar-only).
- **Upcoming/scheduled events** — if start times become schedulable ahead of
  time (see the creation-flow rework above), a "starting soon" section
  becomes valuable, not just "recent finished."
- **Streaks / consistency nudge** — "3 events this week," "on-budget streak:
  4 in a row" — turns the existing metrics into something motivating rather
  than just descriptive.
- **Quick templates** — "Start from your last event" or a couple of
  canned goal-list templates (e.g., "Weekly planning," "Retro") as
  one-click starting points from the landing page, feeding the new
  lightweight creation flow.
- **Greeting/time-of-day personalization** using the user's display name
  already available via `useAuthStore`.

## Events History page — feature ideas

- **Show all statuses**, not just finished — with a status chip
  (draft/active/cancelled/finished) and filter/tabs, so it's truly "all
  events history" per the requirement.
- **Two distinct actions per row**: "Open dashboard" and "View report,"
  matching requirements 2 and 3 literally instead of one overloaded
  "Reopen" button. Disable/hide "View report" for events that never
  finished.
- **Search/filter/sort** — by name, date range, or completion status —
  once the list grows past a handful of entries.
- **Duration and outcome at a glance** in each row (e.g., the same
  over/under-budget language used on the landing page) so users can scan
  history without opening each report.

## Event Dashboard — feature ideas

- **A visible "what's next" focal point** — the currently-open goal is
  already auto-expanded in `GoalsDecisionCollector`; consider surfacing it
  even more prominently (e.g., pinned above the fold) since that's the one
  thing a facilitator needs mid-meeting without scrolling.
- **Tag parking-lot side topics to the current goal** (optionally attach the
  active goal name to a side topic when it's created) so a facilitator can
  trace which milestone a tangent came up during, when reviewing later.
- **Alert on threshold crossing**, not just a color change — e.g. an opt-in
  browser notification or sound, since a facilitator is rarely staring at
  the tab the whole time. (The accompanying visual pulse is covered in the
  UI enhancements doc.)

## Report page — feature ideas

- **Email send** — already flagged as future, but worth scoping now: what
  fields matter (recipients, subject default = event name), and whether it
  reuses the existing `TemplatePreviewModal` render as the email body.
- **Shareable link** as a lighter-weight alternative to email — a read-only
  report URL, useful given Firebase's already in the stack.
- **Export as PDF/image**, since the chart-to-PNG capability
  (`svgElementToPngDataUrl`) already exists for the copy-report flow — a
  natural extension rather than new infrastructure.
- **Trend across events** — "3rd event in a row finishing under budget" —
  connects a single report back to the landing-page metrics for a sense of
  progress over time.

## Cross-cutting feature ideas

- **Onboarding for first-time users** — a lightweight walkthrough or sample
  event on first login, since the whole mental model (draft → live →
  report) isn't obvious from a blank Home page.
- **Keyboard shortcuts** for power users running frequent meetings (e.g.,
  quick-complete the open goal, jump to parking lot).
- **Notifications opt-in** (browser notification when time's about run out)
  for facilitators who tab away during a meeting.

---

## What shipped, and what didn't

Everything above is implemented on `feat/next-version-feature-enhancements`
except the two report-delivery items, with these deliberate readings:

- **Drag-to-reorder** ships alongside keyboard-accessible "Move up"/"Move down"
  entries in the ⋮ menu, since a drag-only affordance isn't reachable without a
  pointer.
- **"The active goal"** — used by the focus card and the parking-lot tag — is
  defined as the first milestone without a completion time, which is the same
  rule the collector already used to auto-expand a row.
- **`cancelled` status** is added to the model, the status chip and the history
  filters, but "Cancel event" still returns an event to `draft` as it always
  did; changing that flow was outside what this document asked for.
- **Threshold alerts** cover browser notifications only; no sound.
- **Email send and shareable links** are scoped in
  `2026-08-01-01-report-delivery-scoping.md`. Both need infrastructure the app
  doesn't have (a Functions project; the data-model migration already specified
  in plan 3), and a parallel sharing mechanism built on today's per-user silo
  would have to be unpicked when that plan lands.
