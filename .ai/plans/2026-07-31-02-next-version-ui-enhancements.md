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

> **Status (2026-08-17):** implemented on
> `feat/next-version-ui-enhancements`. This was written as an ideas list and
> closed with the suggested next step overtaken — all six threads shipped
> rather than the 2–3 it proposed scoping first. The readings taken along the
> way are recorded at the bottom.

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

## What shipped, and the readings taken

All six threads are implemented. Where this document asked a question rather
than describing a change, the answer taken was:

- **Palette.** The signature accent is a violet (`--tw-violet-500`), chosen
  from the cool half so amber and red stay unambiguously about time pressure.
  Colours are split into a raw hue scale and the semantic roles components
  reference; nothing outside `tokens/` names a hex any more.
- **Dark mode.** Shipped with a system/light/dark toggle in the sidebar.
  "System" is resolved in JS so the stylesheet keeps a single dark block.
  Because only semantic roles are redefined, no component rule changed — the
  restructure above is what made that true.
- **Elevation.** `TimeDisplay` gained a `prominent` variant for the dashboard
  countdown: deeper elevation, a lit top edge, a wash of its own theme colour.
  The report's time cards deliberately don't opt in, so that grid stays a grid.
- **Motion.** Check-off reward, threshold-crossing pulse, and tweened burndown
  lines. `prefers-reduced-motion` is honoured globally in `base.css`, and read
  again in JS for the chart, which Recharts animates outside CSS's reach.
- **Empty states.** One `BlankSlate` component with a shared drawing language;
  inline SVG in tokens, so the art follows the palette and the dark variant.
  History's two empty states — no events, and nothing matching the filters —
  are now distinguished, which the single paragraph had conflated.
- **Responsive.** Settled as **desktop-first but phone-usable**, not
  desktop-only: facilitating is a lean-in task, but running a standup from a
  phone is a real case. Fluid display type, tighter chrome under 640px, and
  44px touch targets keyed to `(pointer: coarse)` rather than screen width.

Not attempted, because this document didn't ask for it: a type-scale rework
beyond making the display sizes fluid, and the "smoother burndown line
updates" idea taken further than a tween (e.g. interpolating between
projections rather than between renders).
