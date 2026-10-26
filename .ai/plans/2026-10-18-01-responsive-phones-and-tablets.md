# Tymebox — Fully responsive on phones and tablets

## Context

The owner wants Tymebox to work well on smartphones and tablets, not only on
desktop. Today responsiveness is thin:
- **Media queries:** only 4 of ~50 CSS modules have any.
- **Phone layout:** the sidebar turns into a cramped top bar at 640px,
  `Page` loosens its padding, and the landing stacks.
- **Touch:** `base.css` has a `pointer: coarse` rule giving buttons a 44px
  minimum height.
- **Everything else** (event board, milestone list, report, history toolbar,
  Share modal, date picker, menus, toasts) was built for a mouse and a wide
  window.

The landing page is already responsive (checked at 375px), so it's out of
scope apart from the shared fixes.

**Decisions taken with the owner:**
- **Phones:** a **bottom tab bar** (Home, New event, History, Live event, the
  same links as the sidebar). On top, a slim bar keeps only the logo and an
  account menu holding language, theme, the user's name and sign out.
- **Tablets:** the sidebar starts **collapsed** (icon rail) and can be
  expanded; desktop keeps today's behaviour.

## Breakpoints and shared foundations

- **Breakpoints:** phone ≤ 640px, tablet 641–1024px, desktop > 1024px. They're
  documented in `src/common/tokens/spacing.css`, next to `--tw-bp-phone` and
  `--tw-bp-tablet`, which already exist but are unused. Since CSS can't use
  custom properties in media queries, these are comments plus the literal
  values, used consistently.
- **`src/common/services/viewport/` (new)** offers
  `useMediaQuery(query)` / `useIsPhone()` built on `matchMedia`. The pattern
  matches `usePrefersReducedMotion` in `common/services/motion/`. It's for
  the few places where layout needs JS: the nav swap, and the sidebar's
  tablet default.
- **`src/styles/base.css`:**
  - **No iOS zoom on focus:** text inputs, textareas and selects use a
    16px font on touch devices (`@media (pointer: coarse)`). iOS zooms in on
    focus for anything smaller, which hits the InlineEdit `sm`, history search
    and form fields today.
  - **Viewport height:** use `100dvh` where full-height layouts use `100vh`.
    Today that's `Modal.dialog { max-height: 90vh }` and `App.module.css`
    `min-height`; mobile toolbars break `vh`.
  - **Safe areas:** use `env(safe-area-inset-*)` on the bottom tab bar and on
    fixed toasts. Add `viewport-fit=cover` to the viewport meta in
    `index.html`; the rest of the meta stays.
  - **Touch:** `-webkit-tap-highlight-color: transparent` with visible focus
    and active states. Keep the existing 44px `pointer: coarse` rule, and
    extend it to the Menu trigger, the Select trigger, the ItemLink area and
    the Collapse caret (all smaller today).

## A. Navigation (`src/app/`)

- **Phone (≤ 640px).** `AppSidebar` is replaced by two components:
  - **`MobileTopBar`:** the logo, linked to Home, plus an avatar button that
    opens an account sheet. The sheet holds the name and email,
    `LanguageSelect`, `ThemeToggle` and Sign out, all reused as they are.
  - **`BottomTabBar`:** four tabs with icon + short label (Home, New, History,
    Live). Live shows only while an event is running, as in the sidebar
    today.
    - It's fixed at the bottom, with safe-area padding.
    - `main` gets bottom padding so content isn't hidden behind it.
    - The active tab is shown with the primary colour.
  - Both reuse the routes and `useMeetingStore` logic already in
    `AppSidebar.tsx`. Extract the shared bits (link list, "live" check) into
    a small `useNavItems()` so the two can't drift.
- **Tablet (641–1024px).** `AppSidebar` starts collapsed unless the user
  expanded it before. Today its `localStorage` default is "expanded". The
  collapsed rail already exists, but the language selector currently hides
  when collapsed. On the rail it becomes the globe icon, opening the same
  list.
- **Desktop:** unchanged.
- **Remove** the current 640px top-bar rules in `AppSidebar.module.css`,
  since they're replaced by the components above.

## B. Event board (`features/meeting/dashboard/`, `components/`) — highest priority

This screen gets used live, often on a phone or a tablet on the table.

- **Layout.**
  - **Phone:** the two `Col`s stack. Order matters: countdown first, then the
    current milestone (`GoalFocusCard`), the milestone list and the parking
    lot, with the burndown last. Today the burndown sits under the countdown
    and pushes the milestone list far down.
  - **Tablet portrait:** stacked the same way.
  - **Tablet landscape:** keeps two columns.
  - This needs `Col` `min-width` and an `order` per breakpoint in
    `MeetingDashboard.module.css`, not new markup.
- **Sticky action bar on phones.**
  - Start / Finish / Cancel move into a bar pinned above the bottom tab bar,
    with "Mark as done" for the current milestone, so they're always within
    reach.
  - Today they sit at the very bottom of a long page.
- **Countdown.** On phones the prominent `TimeDisplay` keeps its size
  (`--tw-font-size-display` already clamps). The two toggles (alerts,
  seconds) wrap under it, full width.
- **Header.**
  - The name and badges wrap.
  - `ShareButton` and its shared-by chip drop to their own line on phones.
  - The schedule chips wrap, and so does the "1h box" chip.
- **Milestones** (`GoalsDecisionCollector`).
  - **Drag handle:** reordering by drag doesn't work on touch, so the handle
    is hidden under `pointer: coarse`. The ⋮ menu's Move up / Move down
    (already there) is the touch path.
  - **Row layout:** the row's checkbox, title, "done at" and ⋮ get a 44px row
    height. "Done at" moves under the title on phones.
  - **Automatic mode and Open all:** these wrap.
- **Parking lot:** the cards are full width, and "+ Add side topic" becomes
  full width on phones.
- **Keyboard shortcuts:** hide the "Keyboard shortcuts (?)" hint on touch
  devices (`pointer: coarse` + `hover: none`); the shortcuts still work with
  a keyboard.

## C. Other screens

- **Home** (`home/`).
  - The header's "+ New event" stays visible; on phones it's the only primary
    action besides the tab bar.
  - **Template chips:** they scroll horizontally on phones (one row, with
    snap) instead of wrapping into a tall stack.
  - **Metrics grid:** 2 × 2 on phones (today it's `minmax(160px)` → can drop
    to 1 column at 360px).
  - **List rows:** title and meta stack, badges and ⋮ stay on the right.
- **History** (`history/`).
  - **Filter tabs:** they become a horizontally scrollable strip.
  - **Search and sort:** they stack full-width under them. The search's
    `min-width: 200px` goes on phones.
  - **Rows:** same pattern as Home.
- **Report** (`report/`).
  - **Header:** title and Share wrap.
  - **Goals:** "done at" goes under the name on phones.
  - **Timing:** the three cards stack on phones (today they're `minmax(180px)`
    → fine on tablet).
  - **Footer actions** (Reopen, Print/PDF, Copy report, Start new) become a
    vertical stack of full-width buttons on phones.
  - **Burndown:** the chart keeps a usable height on phones (its
    `height` prop is passed smaller below 640px).
- **Event form** (`form/`): full-width buttons on phones.
- **Sharing** (`share/`).
  - **Share modal:** person rows (avatar, email, role select, Remove) wrap
    so the role select and button sit under the email on phones. The link
    row stacks (input over the "Copy link" button). Request rows get the same
    treatment.
  - **No-access page:** the buttons go full width.

## D. Overlays and shared components (`src/common/components/`)

- **Modal** (`overlay/Modal`). On phones it becomes a **bottom sheet**:
  - full width, anchored to the bottom, rounded top corners;
  - `max-height: 90dvh`, with the body scrolling;
  - footer buttons stacked full-width, primary first.

  That covers confirms, Share, the Report preview, the goal edit modal and the
  shortcut help. On tablets the dialog stays centred, but never wider than the
  screen minus the gutters.
- **Menu (⋮):** the list opens within the viewport (flip and clamp, like
  `Select` already does), and its items get 44px touch targets.
- **Select:** it already positions itself in a portal; on phones the list
  matches the trigger width or larger, and the options get 44px.
- **DatePicker:** on phones the popover becomes a sheet (same as Modal), and
  the 7-column day grid gets 40px cells.
- **Toasts** (`SaveErrorToast`) and the CSS for the `copyError` in modals:
  full width at the bottom, above the tab bar, with safe-area insets.
- **Report preview** (email HTML): the preview container already scrolls; on
  phones it uses the sheet layout above. The email itself is unchanged; it's
  already fluid to 100% width.

## E. Tests

- **`useMediaQuery`:** reacts to `matchMedia` changes, with jsdom stubs
  following `usePrefersReducedMotion`'s tests.
- **Navigation:** with `matchMedia` stubbed to a phone width, `AppShell`
  renders the bottom tab bar (Live only while an event runs) and the account
  sheet with language, theme and sign out. At tablet width the sidebar starts
  collapsed.
- **Board:** on a phone, the sticky action bar shows Start before the event
  and Finish while it runs.
- **Existing tests:** they keep passing. jsdom has no layout, so the visual
  side is checked in the browser, below.

## Verification

1. Run `yarn lint`, `typecheck`, `test`, `test:rules` and `build`.
2. **Visual sweep in headless Chrome.**
   - Re-use the CDP scripts in the scratchpad: sign in with the emulator test
     user, create an event, share it, start it, check milestones, park a
     topic, finish it, open the report, Share and Copy report.
   - Capture each screen at **375×812** (iPhone), **390×844**, **768×1024**
     (iPad portrait), **1024×768** (iPad landscape) and **1280×800**, in
     light and dark, with touch emulation on (`Emulation.setTouchEmulationEnabled`,
     `mobile: true`).
   - Check:
     - nothing overflows horizontally (`document.documentElement.scrollWidth
       === innerWidth`);
     - no text is clipped;
     - tap targets are ≥ 44px (measured with `getBoundingClientRect` on
       buttons and links);
     - the bottom bar never covers content.
3. **In the in-app browser:** use the pane's mobile and tablet presets for a
   hands-on pass of the live board.
4. **After deploy:** the owner tries tymebox.web.app on a real phone
   (iOS Safari and Android Chrome), since that's the only check for safe areas
   and input zoom.

## Rollout

- **Commits:** one commit per area, in this order:
  1. foundations;
  2. navigation;
  3. board;
  4. Home and History;
  5. report and sharing;
  6. overlays.

  Pushed at the end of each area, once the sweep for that area is clean.
- **Desktop:** it must look identical throughout. The desktop screenshots
  from step 2 are compared before and after each commit.

## Outcome

Shipped on 2026-10-18:

- `39ad8c3` foundations:
  - a viewport service with the CSS breakpoints (phone ≤ 640px, tablet
    ≤ 1024px);
  - 16px fields on touch, so iOS doesn't zoom on focus;
  - safe areas;
- `288e54c` a bottom tab bar and an account menu on phones, and an icon rail
  on tablets;
- `8902561` the event board on phones and tablets (countdown → current
  milestone → list);
- `04d731d` Home and History on phones;
- `5eb8177` the report, sharing and overlays on phones.

Fixes found while checking on devices:

- `b713743` the language selector is hidden in the collapsed sidebar;
- `c9298a2` the History status filters scroll instead of widening the page;
- `93a0189` the drag ghost shows only the milestone being dragged;
- `4622f36` the run controls are back in the page footer on phones;
- `4a0d1be` the total duration spans the row when it's alone;
- `83943e1` milestone notes are borderless and focused when a milestone opens.

The phone layout is now checked end to end by `e2e/responsive.spec.ts` (see
`2026-10-25-01-test-coverage-and-e2e.md`).
