# Timebox Works — Next-Version UI/Visual Enhancements Brainstorm

## Context

This is the visual/branding half of the next-version brainstorm — how the
app *looks and feels*, not what it does. (For new capabilities and
behavioral gaps against the stated requirements, see the companion doc:
`2026-07-31-01-next-version-feature-enhancements.md`.) The current palette
(`src/common/tokens/colors.css`) is literally the stock Bootstrap set
(`#0d6efd`, `#28a745`, `#dc3545`, …) applied to plain white `Box`/`Card`
surfaces — functional but generic, and it doesn't reinforce the
"timebox / countdown" identity anywhere besides the emoji favicon and
hourglass icon. This is the highest-priority visual thread for the next
version.

This is an ideas document to react to and prioritize — nothing here should
be built yet.

---

## Palette & branding

- **Give the product its own palette and type scale**, distinct from
  default Bootstrap blues — something that can carry the countdown/urgency
  metaphor (e.g., a signature accent color for "on track," reserving
  red/amber purely for the time-pressure semantics so they stay meaningful
  and don't compete visually with branding).
- **Move to semantic design tokens** (vs. today's mostly hard-coded hex in
  `colors.css` and inline chart colors in `BurndownChart.tsx`) so a palette
  change — or a dark-mode variant — doesn't require touching component code.

## Elevation & hierarchy

- **Add real elevation/depth** — subtle shadows, softer radii, maybe a
  hairline gradient on the primary countdown card — so the dashboard's most
  important element (time left) visually dominates instead of sitting in a
  box the same visual weight as the parking lot.
- **Give the countdown a dedicated visual treatment** distinct from the
  generic `Box`/`Card` used everywhere else (goals, side topics, metrics) —
  right now every panel looks equally important.

## Motion & micro-interactions

- **Motion as a branding tool, not just a mechanism.** `Collapse`, `PostIt`
  auto-grow, and the sidebar collapse already have transitions (per recent
  commits) — extend that language to:
  - A satisfying **goal check-off animation** in `GoalsDecisionCollector`.
  - A brief **pulse on the countdown** when it flips from primary → warning
    → danger, reinforcing the threshold-crossing alert from the feature doc.
  - Smoother **burndown line updates** as progress changes.

## Dark mode

- Nothing in `tokens/colors.css` suggests a dark variant yet — worth
  deciding early since it affects how the palette should be structured
  (semantic tokens vs. hard-coded hex, see above).

## Empty states

- **A distinct empty/blank-slate illustration style** instead of plain text
  paragraphs (`styles.blankSlate` appears in Home, History, parking lot) —
  small SVG/icon treatments would make first-run moments feel designed
  rather than unfinished.

## Layout & responsiveness

- **Mobile/responsive pass.** The dashboard uses a two-column `Row`/`Col`
  layout and a persistent sidebar — worth explicitly deciding whether the
  next version targets phone-sized facilitation (e.g., someone running a
  standup from their phone) or stays desktop-first by design. This decision
  shapes a lot of the other layout work, so it's worth settling early.

---

## Suggested next step

Once you've reacted to these, a good follow-up would be to pick 2–3 threads
(starting with palette/branding, since it's the flagged priority) and turn
*those* into a scoped implementation plan, rather than trying to tackle
everything in this doc at once.
