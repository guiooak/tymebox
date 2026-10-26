# Tymebox — Landing page

## Context

Today a signed-out visitor who opens tymebox.web.app lands on `/login`: a
380px card with the logo, one sentence ("Timebox your events and focus only on
what matters.") and "Continue with Google"
(`src/features/auth/Login/Login.tsx`). It doesn't say what the app does, what
an event looks like, or why it's worth signing in.

The owner wants a proper landing page that:
- presents the app;
- follows the brand manual v3.0 (`docs/brand/tymebox-brand-manual.html`):
  cobalt blue + sand amber, Plus Jakarta Sans / JetBrains Mono, the hourglass
  symbol, light and dark;
- is inviting enough that people want to sign in and try it.

**Defaults used (the questions went unanswered, so these are the recommended
options; easy to change before implementing):**
- **English copy**, same voice as the app.
- **The landing replaces `/login`.** Signed-out `/` shows the landing, with
  "Continue with Google" on the page itself. Signed in, `/` stays Home.
- **A live demo built from the real components**, not screenshots.

## Page structure (`src/features/landing/`)

One route, one scrolling page, built only from existing tokens
(`src/common/tokens/*`) and components. The headline face is Plus Jakarta 800
at −0.02em; times use JetBrains Mono with tabular figures, as in the app.

1. **Top bar.** The `Logo` lockup (`src/features/brand/Logo.tsx`), the theme
   toggle (reuse the sidebar's), and a "Sign in" text button. On scroll it
   becomes sticky with a blurred surface.
2. **Hero.**
   - **Headline:** "Every event, inside its box." Tagline under it: "Plan
     milestones, run the clock, and finish on time. Then see exactly how it
     went."
   - **Primary CTA:** "Continue with Google", with the Google mark. **Secondary
     CTA:** "See how it works", which scrolls to §3.
   - **Reassurance line:** "Free · No setup · Your events stay private until you
     share them."
   - **Right side (stacked below on phones):** the **live mini-board** (see
     *Demo* below) inside a raised surface card with the manual's `lg` shadow.
   - **Background:** a soft radial wash of `--tw-primary` at ~6% plus one sand
     grain. No other decoration (the manual reserves amber for sand and
     "trending late").
3. **How it works.** Three steps, each with a small line icon from
   `common/components/icons/Icon.tsx` and a mono step number:
   - **Plan.** Name it, set the time box, list the milestones (or start from a
     template: Weekly planning, Retro, 1:1, from `home/templates.ts`).
   - **Run.** The countdown keeps everyone honest. Check milestones off and park
     side topics for later.
   - **Review.** A report with the burndown, the timing against plan, and the
     parking lot. Print it or copy it into chat.
4. **Feature rows.** Each row pairs a short text with a component rendered from
   fixed sample data, alternating sides on desktop:
   - **Countdown, three states:** on track, trending late (amber), overdue (red).
     This is `TimeDisplay` with the manual's tints, cycling slowly.
   - **Milestones and burndown:** `BurndownChart`, with sample goals.
   - **Parking lot:** two or three side-topic cards ("Keep the meeting moving;
     come back to these").
   - **Share and collaborate:** a mock of the Share modal's people list: owner
     plus a viewer and a contributor, "Anyone with the link", "Request
     access".
   - **Report:** `TimeCardsGrid` plus the "3rd event in a row under budget"
     streak badge.
5. **Closing CTA band.** A full-width `--tw-surface-sunken` band. The large
   symbol (`TymeboxSymbol`, full variant) sits next to "Your next meeting has
   a box. Use it." and the same Google CTA.
6. **Footer.** The reduced symbol, © year, a link to the brand manual (optional)
   and a GitHub link if the owner wants one.

## The live demo (hero)

`LandingDemo.tsx` runs a scripted ~20s loop with **no store or Firebase**:
- local state only; event "Sprint planning", a 30m box, four milestones;
- it reuses the presentational pieces, `TimeDisplay`, `Badge` (Live),
  `SlimCheckbox` / the milestone list styling, and a small burndown;
- the time is accelerated (1 real second ≈ 1 demo minute), so each milestone
  checks off in turn, the burndown draws, and the countdown shifts into
  "trending late" near the end before "Finished".

Behaviour:
- **Reduced motion:** with `usePrefersReducedMotion`
  (`common/services/motion/`), it shows one static, mid-event frame.
- **Off-screen:** it pauses (IntersectionObserver) and when the tab is hidden.
- **Accessibility:** `aria-hidden` on the animated parts, plus one visually
  hidden sentence that describes them.

If a component is too coupled to the store to reuse, extract its
presentational core first (props in, no hooks into `useMeetingStore`). Do not
duplicate markup.

## Routing and auth (`src/app/AppShell.tsx`)

- **`/` when signed out:** renders `<Landing />` instead of redirecting to
  `/login`.
- **`/login`:** stays as a route that renders the same `Landing`, so the
  `RouteGuard` redirect and `useReturnPath` keep working. A shared event link
  still returns to the event after sign-in.
- **Context line:** when the visitor came from a guarded link (`state.from`),
  the hero shows "Sign in to open the event you were sent".
- **Error and test sign-in:** the sign-in error message and the emulator-only
  `TestSignIn` move from `Login.tsx` into a small `SignInButton` / `SignInPanel`
  used by the landing. `Login.tsx` and its CSS are deleted.
- **Loading:** while `status === 'loading'`, keep today's "Starting Tymebox…"
  loader, so signed-in users never see the landing flash.

## Head, SEO and sharing (`index.html`, `public/`)

- **Title and description:** `<title>` becomes "Tymebox — Timebox your events",
  with a sharper description.
- **Social cards:** add Open Graph / Twitter tags and a 1200×630
  `public/og-image.png`. It's exported from a static frame of the hero (symbol,
  headline, mini-board) in light theme, added once as a file.
- **Crawlers:** the SPA renders client-side. That's fine for Google, and the
  meta tags in `index.html` cover link previews. Pre-rendering is out of scope.

## Responsive and themes

- **Breakpoints:** desktop is two columns in the hero and in the feature rows;
  ≤ 768px stacks to one column with the demo under the CTA.
- **Gutters:** keep the app's container gutters, and no horizontal scroll at
  360px.
- **Dark theme:** every colour comes from semantic tokens, so dark comes for
  free. Check the hero wash and the demo card in both themes. The contrast test
  (`tokens/contrast.test.ts`) still applies.

## Files

- **New:**
  - `src/features/landing/{Landing.tsx, Landing.module.css, LandingDemo.tsx, FeatureRow.tsx, SignInPanel.tsx, index.ts}`
  - `src/features/landing/Landing.test.tsx`
  - `public/og-image.png`
- **Changed:**
  - `src/app/AppShell.tsx` (routes)
  - `index.html` (meta)
  - possibly small presentational extractions in `features/meeting/components`
    and `report/TimeCardsGrid.tsx`
- **Removed:** `src/features/auth/Login/*`, once its pieces moved.

## Verification

1. **Tests:** `yarn test`.
   - Landing renders headline + CTA.
   - The CTA calls `signIn`.
   - It shows the "event you were sent" line when redirected from
     `/events/:id`.
   - Reduced motion renders the static frame.
   - The AppShell route test: signed-out `/` shows the landing, and signed in
     shows Home.
2. **Checks:** `yarn lint`, `typecheck`, `format:check`, `build`.
3. **Manual pass, in the browser pane against the emulators (`yarn dev:local`):**
   - Desktop, 768px and 375px widths, light and dark.
   - The demo loops, pauses off-screen, and is static with reduced motion.
   - The emulator test sign-in lands on Home.
   - A shared `/events/<id>` link while signed out shows the landing with the
     context line, then opens the event after sign-in.
4. **Lighthouse:** run it on the production build (`vite preview`). Targets:
   ≥ 95 for accessibility, best practices and SEO, and no layout shift from the
   demo.
5. **Ship:** commit on `main` and push (per the workflow). After CI deploys,
   check the live page and an OG preview (e.g. paste the link in Slack or
   WhatsApp).

## Outcome

Shipped on 2026-10-17, then polished on 2026-10-23:

- `17ffccd` the landing page for signed-out visitors, with the scripted demo
  board in the hero (`LandingDemo`: a 30-minute sprint planning at 100x,
  paused off-screen and in hidden tabs, a still frame with reduced motion);
- `cf997df` the official "Continue with Google" button (Roboto Medium, the
  standard "G");
- `6fa4dd5`, `c6e5393` the header logo links to the root, without an
  underline on hover;
- `ededff9`, `c955f1b`, `31aaeb4`, `c425ca2` (2026-10-23):
  - the Privacy Policy and Terms of Use links sit beside the tagline in the
    landing footer, with a middle dot between them;
  - the sign-in notice moved below the CTA row;
  - one underline on hover for "See how it works";
  - the Google button keeps its own width instead of stretching;
  - the copy reads "Use-a." in Portuguese.

The app's own footer kept its earlier look: centred, with the logo and no
legal links.
