# Tymebox: test plan (before any refactor or cleanup)

## Context

The engineering review measured **44% of lines and 38% of branches**, with no
minimum in CI.

| Area | Lines | Notes |
|---|---|---|
| Domain (`features/meeting/domain`) | well covered | 8 test files for 11 source files |
| Database rules | 27 tests | Run on the emulator; outside the coverage number |
| `features/meeting` | 30% | The heart of the app |
| `meetingStore.ts` | 19% | 321 lines |
| `MeetingDashboard`, `ShareModal`, `MeetingReport`, `MeetingForm`, `NoAccess`, `DashboardSchedule` | 0% | |
| `MeetingsHistory` | 3% | |
| `common/components` | 49% | Modal, Menu, DatePicker, Form and FormInputsList have no tests |

The owner decided the order:
1. tests;
2. then the cleanups;
3. then the refactors.

Those last two only start once the tests are **active**: running in CI, with a
minimum coverage that blocks the deploy and e2e tests on the emulators. The
point is to give the refactor of `meetingStore` (834 lines) and the large
components a safety net.

**Goal at the end: 100% coverage** of lines, statements, functions and
branches, with **CI blocking any drop below 100%**, plus every main flow
exercised end to end in a real browser. The owner asked for this.

**Size of the gap** (measured):
- 182 files, 116 of them below 100%, 46 at zero;
- about 1,640 lines, 1,280 branches and 685 functions uncovered.

**What 100% means here, so it doesn't become a number game:**
- **Dead code is deleted, not tested.** At least these have no use:
  - `Anchor`, `Animation`, `Divider`, `List`, `ListItem`, `SlimCheckbox`;
  - likely `readCssVar` and `useCssVars`.

  Deleting unused code changes no behaviour, so it's the one exception to
  "cleanup later".
- **Ignores are rare and justified.** `/* v8 ignore next */` is allowed only
  on lines that don't run in jsdom and are covered by e2e (for example,
  App Check starting with a real key, pixel drawing on a canvas). Each ignore
  carries a reason comment and appears in the list in
  `docs/testing.md`.
- **No assertion-free tests.** Every test checks something the person sees,
  or a call or write that matters. Running code just to colour the report
  isn't allowed.
- **Data files count too.** The i18n catalogs have functions (plurals,
  interpolations), and a test calls every one of them in both languages with
  sample values. That's also useful: it catches an exception or `undefined`
  in any text.

This work runs **here, in this session**. The proposed sessions "Cleanup" and
"Refactor" wait until phase 5 is in CI.

## Test types

Five layers, from the fastest and most numerous to the slowest and fewest.
Each catches a different kind of bug.

| Type | What it tests | What it replaces | Tool / where it runs | Approx. count |
|---|---|---|---|---|
| **1. Unit** | Pure functions and isolated modules: domain (`features/meeting/domain`: metrics, burndown, validation, alerts, shape), services (`datetime`, `i18n`, `download`, `clipboard`, `svgExport`), each component in `common/components` on its own | Nothing (pure code) or browser APIs (clipboard, canvas, Notification) | Vitest + jsdom (`yarn test`) | ~60% of tests |
| **2. Component integration** | A whole screen with its children, the router, dialogs and language: what the person sees and does in Dashboard, Report, Share, History, Home and Form, plus the store's real state | The store's **actions** (`vi.fn()`) or the **repository** (`vi.mock`) | Vitest + Testing Library + `user-event` | ~30% |
| **3. Store integration** | `meetingStore` with its logic real: subscriptions, derived state (`currentMeeting`, "Shared with me", roles), and the order and content of writes | Only the **repository** (`vi.mock`); Firebase never runs | Vitest | part of the 30% |
| **4. Database integration** (new) | The **real** `meetingRepository.ts` and `accountRepository.ts` writing to and reading from the **emulator, with the real rules**. Each repository function, run as the right person, is allowed, and the wrong person is refused. Catches the "the code writes to a path the rules don't allow" mismatch, which has already caused production bugs. | Nothing: real Firebase, local | Vitest in the `test:rules` config (it already starts the emulator), new folder `src/test/integration/` | ~30–40 tests |
| **5. End-to-end** | The real app in a real browser (Chromium), with Auth + Database on the emulators: the 4 flows in phase 5, desktop and phone | Only Google sign-in (the emulator's test sign-in stands in) | Playwright (`yarn test:e2e`) | 4 specs, ~15 tests |

**The existing rules tests** (`src/test/rules`) stay as they are. They test
the rules alone, by writing raw paths. Layer 4 complements them: it tests the
app's code against those same rules.

**How each layer fits the coverage number:**
- layers 1–3 are counted in the 100% (`yarn test:coverage`);
- layers 4 and 5 aren't counted. They are required in CI and block the
  deploy, but because they hit Firebase and the browser, they're kept apart
  so the coverage number stays fast and deterministic.

**Left out on purpose** (can come later if needed):
- visual regression with image comparison;
- performance and load testing;
- accessibility testing with axe. That one is cheap: it could become one
  `expect(await axe(container)).toHaveNoViolations()` per screen in layer 2,
  if you want it.

## Principles

- **Test what the person sees and does** (Testing Library: role, label,
  text), not internal state. Assertions in English are fine, since the app
  defaults to `en-US` in tests.
- **Screens:** prime the store with `useMeetingStore.setState(...)` and
  replace its actions with `vi.fn()`, the pattern already in
  `src/features/meeting/share/EventGate.test.tsx`. Nothing touches Firebase.
- **Store:** mock `../domain/meetingRepository`, as
  `src/features/meeting/store/meetingStore.test.ts` already does, and assert
  what was written and the resulting state.
- **Real Firebase only in the e2e tests**, on the emulators.
- **Commits:** one per phase (or per screen in phase 2), each with lint,
  typecheck, tests and build green, pushed to main.

## Phase 0: Infrastructure (one commit)

### 1. `src/test/fixtures.ts`

Typed object factories with sensible defaults and partial overrides:
- `makeMeeting(over?)`, `makeGoal(over?)`, `makeSideTopic(over?)`;
- `makeViewer(over?)`;
- `makeMember(over?)`, `makeRequest(over?)`;
- `makeSharedSummary(over?)`.

They replace the `meeting` literals repeated in `meetingStore.test.ts`,
`GoalsDecisionCollector.test.tsx` and others, which migrate as they're
touched.

### 2. `src/test/render.tsx`

```ts
renderWithApp(ui, { route?, path?, locale?, store?, auth?, phone? })
```

- **Wraps the UI** in the providers the screens use: `DialogProvider`,
  `MemoryRouter` (with a `Route` when `path` is passed) and the language set
  in `useI18nStore`.
- **Primes state:** `store` partially seeds `useMeetingStore`, `auth` seeds
  `useAuthStore`, and `phone` stubs `matchMedia` to ≤ 640px. The `matchMedia`
  stub is the one in `src/app/AppShell.test.tsx`, which moves here.
- **Cleans up after each test:** restores both stores to their initial state
  (`setState(initial, true)`) and resets the language to `en-US`.
- **Returns** the Testing Library result, plus a `user` from
  `@testing-library/user-event`. It's a new devDependency, used for typing,
  Tab and Escape.

### 3. `src/test/setup.ts`

Stubs for what jsdom lacks:
- **`ResizeObserver`:** Recharts in `BurndownChart` needs it on the dashboard
  and the report.
- **`navigator.clipboard`:** `writeText` and `write` as `vi.fn`.
- **`URL.createObjectURL` / `revokeObjectURL`.**
- **`HTMLCanvasElement.getContext`:** returns null, so `svgExport` falls back
  cleanly.
- **`scrollIntoView`.**

### 4. `vite.config.ts`

- Add the `json-summary` reporter (used to read the numbers in CI) and
  `clean: true`.
- **Ratchet thresholds from day one:** `coverage.thresholds` starts at what
  exists today (44/38/43/44) with `autoUpdate: true`. Each phase raises the
  floor automatically and commits the new number, so coverage never goes
  back. The last phase locks it at 100.
- Exclude from coverage only files with no runtime code:
  - `src/**/*.d.ts`;
  - `src/main.tsx` (already excluded);
  - pure type files such as `features/legal/content/types.ts`.

### 5. Dead code (its own commit)

- **Detection:** `knip` (devDependency) finds unused files, exports and
  dependencies.
- **Removal:** what it flags, after checking each item by hand (barrels and
  CSS can confuse it). Includes the components listed under Context.
- **CI:** a `yarn knip` step in the `lint` job, so dead code doesn't come
  back.

## Phase 1: `meetingStore` and services (target 100%)

File: `src/features/meeting/store/meetingStore.test.ts`, organised with one
`describe` per area. The repository mock gains the missing functions. Each
case asserts the repository calls and the new state.

### 1. Session (`bind` / `release`)

The `subscribe*` functions are mocked to capture their callbacks, and the
test calls those callbacks with data.

- loading stays true until the event list and the profile arrive, then goes
  false;
- the profile's language wins; without one, it saves the current language
  (`setUserLocale`);
- `currentMeeting` follows `currentMeetingId` and the list;
- "Shared with me" combines invitations and visited public events, sorted
  live first;
- the legacy migration runs once when `legacy` has events;
- the expired-request sweep runs once per session (`expireRequests`);
- `release()` ends every subscription; calling `bind`'s cleanup afterwards
  changes nothing.

### 2. Open event (`openEvent`)

- owner → `ready`, `role: 'owner'`;
- member → the member's role;
- public link → `publicRole`;
- read denied → `denied`;
- for a person with no access, it subscribes to their own request
  (`myRequest`);
- the returned function closes everything and goes back to `CLOSED_EVENT`.

### 3. Event lifecycle

- `saveDraft`: creates the event and returns the id; the name is required;
- `startMeeting`: sets `realStartTime` and the `active` status;
- `finishMeeting`: sets `realEndTime` and the `finished` status;
- `cancelMeeting`: already covered;
- `reopen`, `reopenInDashboard`, `backToDashboard`;
- `clone` and `createFromTemplate`: new id, goals not done, current event;
- `deleteEvent` and `discardCurrent`;
- a viewer changes nothing (extend the existing case to every action).

### 4. Milestones

`addGoal`, `removeGoal`, `duplicateGoal`, `moveGoal` (edges: first up, last
down), `reorderGoals`, and `updateGoal` (completion and notes).

### 5. Side topics

`addSideTopic` (with the current milestone's name), `updateSideTopic`,
`removeSideTopic`.

### 6. Sharing and requests

- **Owner only:**
  - `setVisibility`;
  - `shareWith` (valid and invalid email), `setMemberRole` and `unshare`;
  - `approveRequest` and `denyRequest`.
- **Requester:** `requestAccess` (sends `uid` and email),
  `cancelAccessRequest`.

### 7. Preferences

`chooseLocale` (already covered) and `setAutomatic`.

### 8. Repository and services, with Firebase mocked

`meetingRepository.ts` and `database.ts` are tested with `firebase/database`
mocked: each function produces the right paths and values, and maps data
correctly, including the normalisation of missing fields. The rules tests
keep proving the rules on the real emulator.

| Service | What to test |
|---|---|
| `meetingRepository.ts` | Paths, values and mapping of every function, including missing fields |
| `database.ts` | `read`, `readWhere`, `writeMany`, `subscribe` and the `onDenied` path |
| `firebaseApp.ts` | Emulators on and off; App Check with and without a key, in dev and in prod |
| `auth.ts` | Every function, including test-user sign-in outside the emulators (throws an error) |
| `clipboard`, `svgExport`, `download`, `notifications`, `motion`, `state`, `uid`, `datetime` | Remaining branches: browser without support, permission denied, invalid date |
| `theme/cssVar` | What survives knip |
| `i18n` | Every function in both catalogs, `detectLocale` and `setLocale`, both signed out and signed in |

## Phase 2: Screens (one commit per screen)

Each screen is rendered with `renderWithApp`, the store primed with fixtures
and its actions as `vi.fn()`.

| Screen | Cases |
|---|---|
| **MeetingDashboard** (`dashboard/`) | **Draft:** the "Start event" button asks for confirmation and calls `startMeeting`.<br>**Running:** shows the countdown, "Mark as done" calls `updateGoal`, "Finish event" confirms and calls `finishMeeting`, "+ Add side topic" calls `addSideTopic`.<br>**Viewer:** no edit controls.<br>**Phone** (`phone: true`): the order is countdown → current milestone → list. |
| **DashboardSchedule** | Start, end and box chips; editing the times calls `updateMeeting`; when the end is before the start, an error shows and nothing is saved. |
| **ShareModal** (`share/`) | Adding an invalid email shows an error; a valid one calls `shareWith`.<br>Changing the role, removing a person, and switching the link to public with a role.<br>"Copy link" uses the clipboard.<br>Requests: approve as viewer or contributor, deny.<br>Non-owner: read-only view. |
| **NoAccess** | Signed out: asks to sign in.<br>No request: message plus "Request access" calls `requestAccess`.<br>Pending request: "Cancel request" calls `cancelAccessRequest`. |
| **MeetingReport** (`report/`) | Shows duration, end and plan; the badge on or over budget; the side topics.<br>"Reopen event" calls `reopenInDashboard`; "Print/PDF" calls `printPage`; "Copy to Email" opens the preview.<br>Event not finished: redirects to the board. |
| **MeetingsHistory** (`history/`) | Status filters (counts and the list changing); text search; ordering.<br>Clicking an item opens the board or the report, depending on status.<br>The ⋮ menu: delete with confirmation calls `deleteEvent`.<br>Empty state. |
| **MeetingForm** (`form/`) | An empty name shows the required message; a valid one calls `saveDraft` and navigates to the board; "Clear" empties the fields. |
| **Home** (extending what exists) | Metrics colours by result (the tone classes); the resume button per state (draft, live, finished); templates call `createFromTemplate`; "See all" goes to `/events`. |
| **GoalsDecisionCollector** (extending) | Check and uncheck; automatic mode opens the next milestone; ⋮ → Move up / Move down / Duplicate / Delete with notes asks for confirmation; notes call `onChangeGoal`. |
| **SaveErrorToast, MobileNav** | The toast appears on a save error and closes; the account sheet opens and Privacy and data opens the modal. |
| **Other `meeting` screens and parts** | `GoalFocusCard`, `DashboardSideTopics`, `DashboardShortcuts` + `ShortcutsHelpModal` (shortcut keys), `GoalEditModal`, `BurndownChart` (with and without data), `TimeCardsGrid`, `useReportTrend`, `AccessRequestsNotice`, `SharedWithMe`, `OnboardingCard`, `ShareButton`, `EventGate` (every state), `ThresholdAlertsWatcher` (fake timers and a mocked `Notification`). |
| **App** | `AppShell` (every route signed in and out, legacy redirects, the live event), `AppSidebar` (collapsed and expanded, tablet), `App.tsx`. |
| **Landing and the rest** | Remaining branches in `Landing`, `LandingDemo` (fake timers), `SignInPanel` (sign-in error, emulator test sign-in), `LegalPage` (both documents and both languages), `PrivacyAndData` (export error, a cancelled popup, a failure part-way). |

**Branches:** for each file, after its happy path, open the HTML report
(`coverage/index.html`) and cover the yellow lines. Each `??`, `?.`, ternary
and `if` gets a case that takes the other side. If a side can never happen,
the code is simplified rather than ignored, and that change gets its own
commit marked "test-driven simplification".

## Phase 3: Shared components (one commit)

| Component | Cases |
|---|---|
| **Modal** (`common/components/overlay`) | Escape closes it (and doesn't with `disableCloseButton`); the overlay closes it only with `closeOnOverlayClick`; the title is the accessible name; body scroll locks while open and unlocks after. |
| **Menu** | Opens and closes; Escape; selecting runs `onSelect` and closes; the `danger` item has its style. |
| **DialogProvider / useDialog** | `confirm` resolves true or false; `alert` resolves on OK. |
| **Select** (extending) | Arrow and Enter keys; keeps a valid selection; the portal positions itself. |
| **DatePicker** | Opens, navigates months, picks a day and calls `onChange`; respects min and max. |
| **Form + useFormField + FormInputsList** | Validation on submit and blur; reset; adding and removing rows in the list. |
| **TimeCountdown / TimeDisplay** | With fake timers: counts down, crosses zero, shows "over budget". |
| **Every other component in `common/components`** | Each one gets a test of its variants (buttons, layout, typography, display, icons, chart): props that change classes, accessible names and the `aria` states. These are small and quick tests. |

## Phase 3b: Database integration (layer 4, one commit)

**Folder:** `src/test/integration/`, run by `yarn test:rules`. The
`vitest.rules.config.ts` config now includes both folders, `rules/` and
`integration/`.

**Setup:**
- connect the app's `firebase/database` to the emulator. `firebaseApp.ts`
  already does this when `VITE_USE_EMULATORS=1`, which the script sets;
- swap the authenticated user per test with `signInAsTestUser` against the
  Auth emulator. That needs the Auth emulator added to `test:rules`, which
  today starts only the database.

**Cases:**
1. **Lifecycle:** `createMeeting` → `patchMeeting`/`putGoal`/`putSideTopic`
   as the owner, all allowed; the same as a stranger, all refused.
2. **Sharing:** `shareWith` → the guest reads; `setMemberRole` → a
   contributor edits; `unshare` → loses access; `setVisibility('public')`
   → anyone signed in reads.
3. **Requests:** `requestAccess` → `approveRequest` → member;
   `denyRequest`; `cancelAccessRequest`; `expireRequests` deletes only
   expired requests.
4. **User data:** `setCurrentMeetingId`, `setUserLocale`, `recordVisit`,
   `forgetVisit`; and `migrateLegacyMeetings`, which moves old events.
5. **Account:**
   - `exportAccount` returns everything that is the person's and nothing of
     anyone else's;
   - `deleteAccount` leaves no node with the person's `uid` or email
     (database dump at the end) and keeps other people's events intact.

## Phase 4: Coverage gate (one commit)

- **`vite.config.ts`:** fix `coverage.thresholds` at **100** for `lines`,
  `statements`, `functions` and `branches`, and turn off `autoUpdate`.
- **CI:** the `test` job already runs `yarn test:coverage`. With the
  thresholds it fails on its own, and `deploy` already depends on it.
- **`docs/testing.md`:**
  - how to run each suite;
  - the patterns (`renderWithApp`, fixtures, store mocks);
  - the ignore policy, with the current list of ignores and the reason for
    each;
  - "new code comes with its tests".
- **README:** link to `docs/testing.md` from the Scripts section.

## Phase 5: End-to-end tests with Playwright (one commit, then CI)

### Setup

- **Dependencies:** `@playwright/test` as a devDependency (respecting the
  3-day age gate). Chromium only, in two projects: desktop (1280×800) and
  phone (iPhone 13 emulation).
- **`playwright.config.ts`:**
  - `webServer` starts `yarn dev:local --port 5300` and waits for the port;
  - the emulators come from `firebase emulators:exec --only auth,database
    "playwright test"` in the `yarn test:e2e` script, the same pattern as
    `test:rules`;
  - traces and screenshots are kept on failure.
- **Sign-in:** the emulator-only "Test sign-in" field on the landing
  (`TestSignIn` in `src/features/landing/SignInPanel.tsx`), with one unique
  email per test, so the tests don't depend on each other.
- **Folder `e2e/`:**
  - `fixtures.ts` with `signIn(page, email)` and `createEventFromTemplate(page,
    name)`;
  - one spec per flow.

### The four flows

1. **`event-lifecycle.spec.ts`:**
   1. sign in;
   2. create from the Retro template;
   3. start;
   4. mark 2 milestones done, writing a note in one;
   5. add a side topic;
   6. finish;
   7. the report shows the duration and the side topic;
   8. "Reopen event" goes back to the board.
2. **`sharing.spec.ts`:**
   1. Ana creates an event and shares it with Bruno as a viewer;
   2. Bruno sees it under "Shared with me" and opens it without edit
      controls;
   3. Carla opens the link and requests access;
   4. Ana approves her as a contributor;
   5. Carla manages to tick a milestone.

   The three people use three browser contexts.
3. **`account.spec.ts`:**
   1. create an event;
   2. Privacy and data → Export (check the downloaded JSON has the event);
   3. Delete account by typing DELETE;
   4. back on the landing, signing in again with the same email shows no
      events.
4. **`responsive.spec.ts`:**
   - the Home, board and report screens at phone width;
   - no horizontal scroll (`scrollWidth === innerWidth`);
   - the bottom tab bar is visible.

### CI

- **New `e2e` job:**
  1. checkout;
  2. Node 24;
  3. Java 21;
  4. `yarn install`;
  5. `npx playwright install --with-deps chromium` (with cache);
  6. `yarn test:e2e`.
- **On failure:** upload the Playwright report as an artifact.
- **Deploy:** `deploy` and `deploy-rules` get `needs: e2e`, and the `if` of
  `deploy` checks `needs.e2e.result == 'success'`, like the other jobs.

## CI at the end (every push to main and every PR)

- **Jobs, running in parallel:**
  - `lint` (with `knip`);
  - `typecheck`;
  - `test`: layers 1–3, with coverage at 100;
  - `test-rules`: rules plus layer 4;
  - `e2e`: layer 5;
  - `audit`, `format`, `build`.
- **Deploy:** `deploy-rules` and `deploy` only run when all of them pass. On
  PRs the deploy goes to the preview channel.
- **Workflow:** the owner keeps pushing straight to `main`. CI stops the
  deploy, not the commit; branch protection was considered and declined.

## After the tests are active

- **Dismiss and re-propose the session cards:**
  - "Tests" is done here, so its card is dismissed;
  - "Cleanup" is re-proposed saying it needs phase 5 green in CI, with its
    brief unchanged;
  - "Refactor" is re-proposed after Cleanup, with its brief unchanged.
- **Cleanups and refactors** use these tests as their acceptance criterion:
  CI green, with no lowering of the limits.

## Verification per phase

- **Local:** `yarn lint`, `yarn typecheck`, `yarn test:coverage` (read
  `coverage/coverage-summary.json` and report the numbers), `yarn build`.
  - Phase 5 locally needs Java 21 (`brew install openjdk@21`); without it,
    validate in CI.
- **Stability:** run each new suite 3 times in a row (`--repeat-each` in
  Playwright, a loop in Vitest).
- **Prove the e2e tests catch real breakage:** temporarily break one rule
  in `database.rules.json` (for example, deny `sharedWith`), see
  `sharing.spec.ts` fail, then revert. This isn't committed.
- **CI:** after the push of phases 4 and 5, follow the run to the end and
  confirm the deploy waits for `e2e`.

## Files involved

- **New:**
  - `src/test/fixtures.ts`, `src/test/render.tsx`;
  - `*.test.tsx` next to each screen and component listed;
  - `e2e/*.spec.ts`, `e2e/fixtures.ts`, `playwright.config.ts`.
- **Changed:**
  - `src/test/setup.ts`;
  - `vite.config.ts` (reporters and thresholds);
  - `package.json` (`test:e2e`, `@playwright/test`,
    `@testing-library/user-event`);
  - `.github/workflows/ci.yml` (e2e job and deploy dependencies);
  - `.gitignore` (`playwright-report/`, `test-results/`);
  - `README.md` (Scripts and coverage limits);
  - `src/features/meeting/store/meetingStore.test.ts`;
  - `src/app/AppShell.test.tsx` (uses the shared `matchMedia`).
- **Production code changes in only three situations:**
  - removing dead code (phase 0);
  - adding an accessible name where a screen can't be tested by role or
    label (never a `data-testid`);
  - simplifying a branch that can never happen.

  Each lands in its own commit, separate from the tests.

## Expected size and order

This is long work: about 80 to 100 new test files. It's delivered in
commits per area, each one raising the floor (the ratchet), so progress is
never lost:
1. phase 0: infrastructure, knip and dead code;
2. phase 1: store, then repository and services;
3. phase 2: one screen per commit;
4. phase 3: shared components;
5. phase 4: fix the floor at 100;
6. phase 5: e2e.

After each commit, I report the overall number and the files still below
100%.

## Outcome

Executed between 2026-10-25 and 2026-10-26, from 44% of lines and 38% of
branches.

**Numbers at the end:**

| Suite | Result |
| --- | --- |
| Unit, screen and store (`yarn test:coverage`) | 764 tests; 100% of lines, statements, functions and branches; zero ignores |
| Rules and integration (`yarn test:rules`) | 46 tests (27 rules, 19 repository tests on the emulators) |
| End to end (`yarn test:e2e`) | 4 specs, 6 runs across desktop and phone; stable over 3 repeats |

CI gates both deploys on all of them. The thresholds sit at 100 with the
ratchet off, and `docs/testing.md` documents the layers, the helpers and the
rules for tests.

**Bugs the tests found, each fixed in its own commit:**

| Commit | Fix |
| --- | --- |
| `8fc2e0b` | Clearing the time in the date picker no longer throws |
| `0a59447` | Dialogs are named by their title (`aria-labelledby`) |
| `9161d52` | Switches carry `role="switch"` and their name on the input |
| `b6676cc` | The report no longer breaks for an event without planned times |
| `b9ece88` | An access request with a blank name shows the email |
| `fce08e3` | The new-event form's labels are linked to their fields |
| `5242e6c` | Expiring requests failed for an owner with a deleted event: the batch deleted a node the rules don't allow (found by the emulator integration tests) |

**Code removed or simplified:**

- **`0308a8a`** dead code removed, with knip in CI to keep it out:
  - components: Animation, List, ListItem, Divider, Header, Anchor,
    SlimCheckbox and FormInputsList;
  - unused helpers.
- **Test-driven simplifications** (unreachable branches removed rather than
  ignored), each in its own commit marked so: `24a9bae`, `f0d142e`,
  `00300d1`, `3fc0384`, `e7bd4de`, `e606711`, `1b6f846`, `caaad10`,
  `3813b72`.
  - `3813b72` also dropped the Form's field grouping, whose only user was the
    removed FormInputsList.

**How it differs from the plan:**

- **Integration setup:** the integration tests reuse
  `@firebase/rules-unit-testing` only to read and write with the rules off.
  Its default database namespace isn't the app's, so the harness addresses
  the app's database URL directly.
- **e2e configuration:**
  - Playwright starts the dev server on 127.0.0.1:5300.
  - `e2e/` has its own `tsconfig.e2e.json` (with DOM types for
    `page.evaluate`) and declares the two Node APIs it uses, rather than
    adding `@types/node`.
- **Proof that the e2e tests catch breakage:** with `sharedWith` reads
  denied in the rules, `sharing.spec.ts` failed. The rules were then
  restored; this wasn't committed.

**Next:**

- The Cleanup and Refactor sessions can start now, with these suites as
  their acceptance criterion.
- One gap the e2e run surfaced: when the rules refuse "Shared with me",
  Home waits forever instead of showing it empty, because
  `subscribeSharedWith` has no `onDenied`.
