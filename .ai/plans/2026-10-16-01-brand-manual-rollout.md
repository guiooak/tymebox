# Tymebox — Applying the Brand Manual v3.0 to the App

## Context

The logo manual and style guide v3.0 now live in
`docs/brand/tymebox-brand-manual.html`. The app doesn't follow it yet:

- **Palette** — `src/common/tokens/colors.css` is still the stock Bootstrap
  set (`#0d6efd`, `#28a745`, …). About 40 hard-coded colours remain outside
  `tokens/`: `Badge`, `Card`, `Button`, `TimeDisplay` (`color-mix(…, white)`),
  `PostIt`, `Modal`, and inline chart colours in `BurndownChart.tsx` and
  `LineChart.tsx`.
- **Type** — `--tw-font-sans` names Inter but nothing loads it, so users get
  Roboto/system. Timers use the system mono stack.
- **Logo** — `Logo.tsx`, the collapsed sidebar and the Login card show the ⏳
  emoji, which the manual lists as a misuse. `public/favicon.svg` is a
  different hourglass drawing.
- **No dark mode**, while the manual specifies both themes.

**Draft PR guiooak/tymebox#3** (`feat/next-version-ui-enhancements`, 10
commits) already builds most of the needed infrastructure:

- a two-layer token system (raw hues → semantic roles) with no hex outside
  `tokens/`;
- dark mode with a system/light/dark toggle and a pre-paint boot script;
- a theme store with tests;
- chart colours resolved from tokens (including a fix for `color-mix()` values
  leaking into SVG/canvas exports);
- an elevation scale, the countdown hero treatment, motion, illustrated blank
  slates and a responsive pass.

Its palette is the problem: a **violet** signature accent that contradicts the
manual's cobalt blue + amber sand.

**Decision taken:** reuse PR #3 instead of redoing it. Its commits are
cherry-picked onto `main` and then re-skinned to the manual. All work is
committed **directly on `main`** (the owner's call: no feature branch). PR #3 is
closed at the end with a pointer to the commits on `main`.

`git merge-tree` shows a single conflict against today's `main`:
`src/features/meeting/dashboard/DashboardSideTopics.tsx`. On `main` the
text-length caps came from `07073e8`; PR #3 adds the blank slate there. Keep
both changes.

> ⚠️ **Don't push between phase A and phase B.** Every push to `main` deploys
> once CI passes. Phase A alone would ship the violet theme to production. Push
> once phases A–C are in (palette, type and logo together), or at the end.

---

## A. Bring PR #3 onto `main`

1. Cherry-pick the PR's ten commits in order (`930afd0` … `72c412c`):
   `git cherry-pick 930afd0^..72c412c`. Resolve `DashboardSideTopics.tsx` by
   keeping `main`'s `maxLength` caps plus the PR's blank slate.
2. Check the PR's own files for leftover brand strings. The PR predates the
   rename, so search for `Timebox Works` / `tw-theme` copy and fix it.
3. Run `yarn lint && yarn typecheck && yarn test && yarn build`. The PR
   reported 31 tests; `main` has more since then. Everything must pass before
   moving on.

## B. Palette and semantic tokens (`tokens/colors.css`, `tokens/dark.css`)

Replace **layer 1** with the manual's scales:

- Blue 50–900, Amber 50–900 and Slate 50–950, Tailwind-standard values, as in
  the manual.
- Emerald and red only at the steps the manual uses (`#059669` / `#047857` /
  `#34D399`; `#DC2626` / `#F87171`).
- Remove the violet, sky, custom green/red and the warmed slate.

Remap **layer 2**:

| Role | Light | Dark | Notes |
|---|---|---|---|
| `--tw-bg` | slate-50 | slate-900 | |
| `--tw-surface` / `-raised` | white | slate-800 | |
| `--tw-surface-sunken` | slate-100 | `#172033` | |
| `--tw-border-color` / `-strong` | slate-200 / 300 | slate-700 / 600 | |
| `--tw-text` / `-muted` / `-subtle` | slate-900 / 500 / 400 | slate-50 / 400 / 500 | |
| `--tw-primary` (fills) | blue-600 | **blue-600** | white text 5.2:1 in both themes |
| `--tw-primary-strong` (hover) | blue-700 | blue-500 | |
| `--tw-primary-text` (links, text) | blue-600 | blue-400 | PR #3 lifts `--tw-primary` itself to 400 in dark; the manual keeps fills at 600 |
| `--tw-success` / `-text` | `#059669` / `#047857` | `#059669` / `#34D399` | |
| `--tw-warning` / `-text` / `--tw-on-warning` | amber-500 / amber-700 / slate-900 | amber-400 / amber-400 / slate-900 | never white on amber (2.15:1) |
| `--tw-danger` / `-text` | `#DC2626` | `#DC2626` / `#F87171` | |
| `--tw-info` / `-text` | blue-700 | blue-400 | |
| **new** `--tw-logo` | blue-600 | blue-500 | symbol stroke |
| **new** `--tw-sand` / `--tw-accent` | amber-500 | amber-400 | sand; `--tw-on-accent` slate-900 |
| `--tw-chart-progress` | primary | primary | |
| `--tw-chart-projection` | **accent** (amber) | accent | was success green in PR #3; the manual uses amber dashed |
| `--tw-chart-tendency` | slate-400 | slate-500 | |

**Splitting `--tw-primary` by use.** The dark variant keeps the fill at 600, so
every place that uses `--tw-primary` as *text* or a *stroke on the page
background* has to move to `--tw-primary-text`. On `main` the token has about
30 uses. Audit each one: fills stay, text/links/outlines move. This is the
fiddliest part of the phase; the contrast test in E catches misses.

**What amber means.** PR #3 reserves amber for time pressure, while the manual
uses it for the sand and the "trending late" state. Those are compatible:
amber is the sand in the logo plus the *trending late* state and nothing else.
No decorative amber in the UI. Countdown states: on track = neutral surface,
trending late = warning tint, overdue = danger tint (manual §08).

**Other tokens.**

- **Radius:** sm 6 · md 10 · lg 14 · xl 20 · pill (manual §07). Reconcile with
  PR #3's `radius.css`.
- **Shadows:** take the manual's sm/md/lg values in both themes.
- **Prefix:** keep the `--tw-` prefix. Renaming the ~530 references to `--tb-`
  would be churn with no user value. The manual's token export uses `--tb-`, so
  add a one-line note in the manual/README mapping one to the other.

## C. Typography (`tokens/typography.css`, `index.html`)

1. **Load the fonts.** Recommended: self-host with `@fontsource-variable/plus-jakarta-sans`
   and `@fontsource/jetbrains-mono` (400/600/700). The reasons:
   - no third-party request to Google, which matters for privacy and for the
     planned PWA/offline mode;
   - the files are fingerprinted by Vite;
   - `npmMinimalAgeGate` and `enableScripts: false` apply as usual (these
     packages need no build scripts).

   The alternative is a Google Fonts `<link>` with `display=swap`, which is
   simpler but adds a third-party request.
2. **Tokens.**
   - `--tw-font-sans: 'Plus Jakarta Sans Variable', system-ui, …`
   - `--tw-font-mono: 'JetBrains Mono', ui-monospace, …`
   - Size scale per the manual: 12 / 14 / 16 / 18 / 20 / 28 / 36 / 48.
     Today's `xl` 1.75rem = 28 and `xxl` 2.5rem = 40 → 36. Add `display` 48.
   - Weights 400 / 500 / 600 / 700 / 800.
   - Heading letter-spacing −0.02em.
3. **Numbers.**
   - `font-variant-numeric: tabular-nums` on `TimeDisplay`, `TimeFormat`,
     metric tiles and history rows.
   - JetBrains Mono only for countdown values, report time cards and schedule
     chip times (manual §06).

## D. Logo, favicon and app icons

1. **Symbol component.** Add `src/app/brand/TymeboxSymbol.tsx` with
   `variant: 'full' | 'reduced'`. It holds the manual's exact geometry
   (100-unit grid, `pathLength="120"` dial, two-triangle hourglass) and is
   coloured through `var(--tw-logo)` / `var(--tw-sand)` so it follows the
   theme. Pick the variant from the rendered size: below 48px it is `reduced`
   (manual §04). Add a comment pointing to the manual as the source of truth,
   because the geometry now lives in two places.
2. **Lockup.** `Logo.tsx` becomes symbol + wordmark: Plus Jakarta 800, −3%
   tracking, gap 0.28H, name 0.6H.
3. **Placements.**
   - Sidebar expanded: lockup with the reduced symbol at 28px.
   - Sidebar collapsed: reduced symbol at 28px.
   - Login card: full symbol at 64px over the wordmark (vertical lockup).
4. **Remove brand emoji.** Drop ⏳ from `Logo`, `AppSidebar` (collapsed) and
   `Login`. Change the `DashboardSchedule` "⏳ 1h 00m box" chip to plain text
   (14px is below the symbol's minimum size).
5. **Static assets.**
   - Export `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` (180) and
     `icon-192.png` / `icon-512.png` from the manual's Downloads section into
     `public/`.
   - Wire them in `index.html`, plus
     `<meta name="theme-color">` for light (`#F8FAFC`) and dark (`#0F172A`).
   - The PWA manifest stays with the PWA plan; this only puts its icons in
     place.

## E. Component re-skin (manual §08)

Most components only need the new tokens once PR #3's semantic layer is in.
These need their own attention:

- **Buttons**
  - `md` radius;
  - primary blue for the screen's main action;
  - **success (emerald) only for Start/Finish event**;
  - destructive actions (Cancel event, Remove) as danger *outline*.
- **Badges** — exactly the manual's five statuses: Live (success), Setting up
  (neutral), Trending late (warning), Finished (info), Cancelled (danger).
  `Cancelled` is reachable now that `07073e8` records the status.
- **Countdown** — PR #3's hero treatment in the three manual states. The value
  uses mono and tabular figures.
- **Current milestone card** — left 4px primary stripe, "Now" chip, "n of m"
  in tabular figures.
- **Burndown** — progress blue, tendency slate dashed, projection amber dashed.
  Check that the chart download (`svgExport.ts`) still resolves concrete
  colours in both themes, as PR #3's `eaad41d` did.
- **Report time cards** — late = warning tint, early/saved = success tint.
- **Parking lot** — the manual draws side topics as neutral sunken cards. The
  yellow `PostIt` (`--tw-postit-bg` butter) goes away for consistency.
- **Print** — `@media print` must force the light tokens, so a report printed
  from dark mode comes out on white paper.

**Optional, one separate commit.** Swap the emoji/glyph navigation icons
(`⌂ ＋ 🗂 ⏱ ⎋`) and the onboarding emoji (`📝 🧩 ⏱ 📊`) for a small inline-SVG
line icon set in `src/common/components/icons/`. That means 5–9 icons and no
new dependency. Leave emoji in the copy (🔥 streaks, OS notifications) as is.

## F. Guards

- **Contrast test.** Add `src/common/tokens/contrast.test.ts`. It parses
  `colors.css` and `dark.css`, resolves the `var()` chains and asserts WCAG
  ratios for the key pairs in both themes:
  - ≥ 4.5 for text on its background (text, muted, primary-text, success /
    warning / danger / info text);
  - ≥ 3 for the symbol and UI strokes;
  - white on `--tw-primary` ≥ 4.5;
  - `--tw-on-warning` on warning ≥ 4.5.

  This is the regression net for the `--tw-primary` split.
- **Lint for literal colours.** Optionally add a stylelint rule or a small test
  that fails on hex/rgb literals outside `tokens/`. This keeps PR #3's
  guarantee true.

## Verification

1. `yarn lint && yarn typecheck && yarn test && yarn build` after every commit.
2. Visual pass in **both themes**, desktop and 375px, on Login, Home,
   Dashboard (draft → live → trending late → overdue), Report and History.
   - The routes are behind Google sign-in. Use a local harness that aliases
     `firebase/{app,auth,database}` to in-memory fakes through a throwaway Vite
     config (as used in the 2026-10-16 review), or sign in yourself on a
     preview channel.
   - Pay particular attention to the symbol at 16/24/28px and the favicon in
     a real browser tab.
3. Compare each screen against the manual's §08 examples side by side.
4. Print a finished report from dark mode and check that the output is light.
5. Check the chart PNG/SVG download in both themes.

## Commit sequence (all on `main`)

1. The ten cherry-picked PR #3 commits.
2. `feat(tokens): adopt the brand manual palette and semantic roles`
3. `feat(type): self-host Plus Jakarta Sans and JetBrains Mono`
4. `feat(brand): Tymebox symbol, lockup, favicon and app icons`
5. `feat(ui): restyle components to the brand manual`
6. `test(tokens): guard colour contrast in both themes`
7. *(optional)* `feat(ui): line icons for navigation and onboarding`
8. `docs: README brand section and plan closeout`

The README update removes the "app doesn't use these tokens yet" note and
records the `--tw-` ↔ `--tb-` mapping. Then **push** (one deploy), and close
PR #3 with a comment listing the commits on `main`.

## Open Items

- **Fonts:** self-hosted (recommended) or Google Fonts `<link>`?
- **Navigation icons:** in scope now (step 7) or later?
- **PostIt:** drop the yellow sticky-note look for side topics (follows the
  manual), or keep it as a deliberate exception and add it to the manual?
- **PR #3's other threads** come along with the cherry-pick: motion, blank
  slates and the responsive pass. If any of them isn't wanted, drop its commit
  during phase A instead of reverting it later.
- **Manual follow-up:** if implementation forces a token change (e.g. the
  dark `surface-sunken` value), update `docs/brand/tymebox-brand-manual.html`
  in the same commit so the manual stays the source of truth.

---

## Outcome (2026-10-16)

Shipped on `main` as planned, with the recommended options: self-hosted fonts,
navigation icons included, and the yellow PostIt dropped.

Deviations and findings:

- **Lint fix in PR #3.** The cherry-picked `useCssVars` failed the upgraded
  `eslint-plugin-react-hooks` (non-trivial dependency expression). It was
  fixed in its own commit.
- **The contrast test caught four palette failures.** They were fixed in both
  `tokens/` and the manual:
  - success fills move to emerald-700 (white on emerald-600 is 3.8:1);
  - the light-mode projection line uses amber-600 (amber-500 is 2.1:1 on
    white);
  - the light-mode tendency line uses slate-500 (slate-400 is 2.6:1);
  - the dark hover fill darkens to blue-700 (blue-500 is 3.7:1 with white
    text).
- **Brand components live in `src/features/brand/`**, not `src/app/brand/`.
  Login is a feature and must not import from `src/app`.
- **Dial geometry.** It uses real dash lengths
  (`4.398 10.263`, offset `2.199`) instead of `pathLength="120"`. librsvg
  ignores `pathLength`, so the exported PNG icons came out with uneven marks.
  The manual keeps `pathLength`; both render the same 12 marks in browsers.
- **Print.** The dark tokens sit under `@media screen`, so printing always
  uses the light theme.
- **Not done.**
  - A lint rule against literal colours. A few intentional literals remain:
    chart fallbacks and the countdown's highlight gradient.
  - Verification ran against the local fake-Firebase harness, not a signed-in
    deploy. Print and the chart download weren't exercised.
