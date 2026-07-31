# Timebox Works — Next-Version UX/UI Brainstorm

## Context

Timebox Works already implements most of the requested feature set: a Home
landing page with recent-meetings + metrics, a History page, a live Dashboard
(countdown, burndown chart, goal notes, parking lot), and a Report page with
timing cards. The ask now is not new features so much as making the *existing*
flow feel obviously easy to pick up — sharper UX, more modern/branded UI, and
closing a few real gaps against the stated requirements. Two areas called out
as highest priority: **(1)** the upfront creation form, which currently
front-loads far more than the "Trello-like, just title + description" flow
described in requirement 7, and **(2)** visual polish/branding, which is
still a fairly plain Bootstrap-era palette (`src/common/tokens/colors.css`)
applied to boxy `Box`/`Card` components throughout.

This is an ideas document to react to and prioritize — nothing here should be
built yet.

---

## Gap check against the written requirements

| Requirement | State | Note |
|---|---|---|
| Landing: last 5 meetings | ✅ Done | `useMeetingMetrics` caps `recent` at 5 |
| Landing: Create New event button | ✅ Done | `Home.tsx` header |
| Landing: Events log button | ⚠️ Partial | Only reachable via the sidebar's "History" link — no CTA on the landing page itself |
| History: list all events | ⚠️ Partial | `MeetingsHistory` only lists `status === 'finished'` — drafts/cancelled events are invisible, so "all events history" isn't literally true |
| History: reopen into Dashboard | ❌ Missing | The single "Reopen" button always routes to `paths.report`, never `paths.liveMeeting`. Two distinct requirements collapsed into one button. |
| History: reopen into Report | ✅ Done | Same button, but only this path exists |
| Dashboard: agenda/milestones list | ✅ Done | `GoalsDecisionCollector` |
| Dashboard: per-milestone notes | ✅ Done | `decisions` textarea per goal |
| Dashboard: countdown w/ time left | ✅ Done | `TimeCountdown` |
| Dashboard: countdown color thresholds | ✅ Done | primary → warning (tendency crossover) → danger (overdue) |
| Dashboard: burndown w/ tendency + reality | ✅ Done | `BurndownChart` (tendency, progress, projection) |
| Dashboard: parking lot | ✅ Done | `DashboardSideTopics` + `PostIt` |
| Dashboard: form has only Title + Description upfront | ❌ Missing (priority) | `MeetingForm` also requires start/end time and at least one goal before you can open the dashboard |
| Dashboard: everything editable anytime | ⚠️ Partial | Goal notes/completion and side topics are editable live; start/end time is not editable from inside the dashboard at all |
| Report: title/description | ✅ Done | |
| Report: milestones + notes + resolved time | ✅ Done | |
| Report: burndown snapshot | ✅ Done | |
| Report: parking lot | ✅ Done | |
| Report: performance cards w/ color | ✅ Done | `TimeCardsGrid` + `timeDisplayFeedbackRules` |
| Report: send by email | ❌ Not built (explicitly future) | Currently there's a "Copy report" → clipboard/preview modal (`TemplatePreviewModal`) instead |

---

## Priority 1 — Rework the creation flow into a true Trello-like flow

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
- **Per-goal overflow menu (⋮) with Edit / Delete / Duplicate.** Each row in
  `GoalsDecisionCollector` gets a vertical-ellipsis menu next to the
  checkbox/title:
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

## Priority 2 — Visual polish & branding

Current palette (`colors.css`) is literally the stock Bootstrap set
(`#0d6efd`, `#28a745`, `#dc3545`, …) applied to plain white `Box`
surfaces — functional but generic, and doesn't reinforce the "timebox /
countdown" identity anywhere besides the emoji favicon and hourglass icon.

Ideas:
- **Give the product its own palette and type scale**, distinct from
  default Bootstrap blues — something that can carry the countdown/urgency
  metaphor (e.g., a signature accent color for "on track," reserving
  red/amber purely for the time-pressure semantics so they stay meaningful
  and don't compete visually with branding).
- **Add real elevation/depth** — subtle shadows, softer radii, maybe a hairline
  gradient on the primary countdown card — so the dashboard's most important
  element (time left) visually dominates instead of sitting in a box the
  same weight as the parking lot.
- **Motion as a branding tool, not just a mechanism.** `Collapse`,
  `PostIt` auto-grow, and the sidebar collapse already have transitions
  (per recent commits) — extend that language to goal completion (a
  satisfying check-off animation), countdown threshold crossings (a brief
  pulse when it flips to warning/danger), and burndown line updates.
- **Dark mode.** Nothing in `tokens/colors.css` suggests a dark variant yet;
  worth deciding early since it affects how the palette is structured (semantic
  tokens vs. hard-coded hex).
- **A distinct empty/blank-slate illustration style** instead of plain text
  paragraphs (`styles.blankSlate` appears in Home, History, parking lot) —
  small SVG/icon treatments would make first-run moments feel designed
  rather than unfinished.

---

## Landing page — beyond what's already there

Current: header + resume-in-progress banner + 4 metric tiles + recent-5 list.

Ideas for "what else":
- **Explicit "View all history" CTA** on the page itself (closes the gap
  above — right now it's sidebar-only).
- **Upcoming/scheduled events** — if start times become schedulable ahead of
  time (see Priority 1), a "starting soon" section becomes valuable, not
  just "recent finished."
- **Streaks / consistency nudge** — "3 events this week," "on-budget streak:
  4 in a row" — turns the existing metrics into something motivating rather
  than just descriptive.
- **Quick templates** — "Start from your last event" or a couple of
  canned goal-list templates (e.g., "Weekly planning," "Retro") as
  one-click starting points from the landing page, feeding the new
  lightweight creation flow.
- **Greeting/time-of-day personalization** using the user's display name
  already available via `useAuthStore`.

## Events History page — beyond what's already there

- **Show all statuses**, not just finished — with a status chip
  (draft/active/cancelled/finished) and filter/tabs, so it's truly "all
  events history" per the requirement.
- **Two distinct actions per row**: "Open dashboard" and "View report,"
  matching requirements 2 and 3 literally instead of one overloaded
  "Reopen" button. Disable/hide "View report" for events that never
  finished.
- **Search/filter/sort** — by name, date range, or completion status —
  once the list grows past a handful of entries.
- **Duration and outcome at a glance** in each row (e.g., a tiny inline
  burndown sparkline or the same over/under-budget language used on the
  landing page) so users can scan history without opening each report.

## Event Dashboard — beyond what's already there

- **Inline, click-to-edit title and description** at the top of the
  dashboard (confirmed) — click the heading/paragraph to turn it into an
  input/textarea in place, no separate edit form, matching how goal notes
  and side topics already behave. Same treatment should extend to
  start/end time, supporting Priority 1 and requirement 8 literally.
- **A visible "what's next" focal point** — the currently-open goal is
  already auto-expanded in `GoalsDecisionCollector`; consider surfacing it
  even more prominently (e.g., pinned above the fold) since that's the one
  thing a facilitator needs mid-meeting without scrolling.
- **Tag parking-lot side topics to the current goal** (optionally attach the
  active goal name to a side topic when it's created) so a facilitator can
  trace which milestone a tangent came up during, when reviewing later.
- **Sound/visual cue on threshold crossing**, not just a color change — a
  meeting facilitator is rarely staring at the tab.

## Report page — beyond what's already there

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

## Cross-cutting

- **Mobile/responsive pass.** The dashboard uses a two-column `Row`/`Col`
  layout and a persistent sidebar — worth explicitly deciding whether the
  next version targets phone-sized facilitation (e.g., someone running a
  standup from their phone) or stays desktop-first by design.
- **Onboarding for first-time users** — a lightweight walkthrough or sample
  event on first login, since the whole mental model (draft → live →
  report) isn't obvious from a blank Home page.
- **Keyboard shortcuts** for power users running frequent meetings (e.g.,
  quick-complete the open goal, jump to parking lot).
- **Notifications opt-in** (browser notification when time's about run out)
  for facilitators who tab away during a meeting.

---

## Suggested next step

Once you've reacted to these, a good follow-up would be to pick 2–3 threads
(e.g., "lightweight creation flow" + "visual palette refresh") and turn
*those* into a scoped implementation plan, rather than trying to tackle
everything in this doc at once.
