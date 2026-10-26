# Testing

Tymebox is tested in layers. The first three run in Vitest under jsdom and
count towards coverage, which is held at **100%** of lines, statements,
functions and branches: CI fails below it, and the deploy waits for CI. The
others hit the real Firebase emulators or a real browser, so they run apart
and don't count towards the number. All of them run in CI on every push and
pull request.

| Layer | What it tests | Where | Run with |
| --- | --- | --- | --- |
| Unit | Pure functions, services, each shared component | next to the code (`*.test.ts(x)`) | `yarn test` |
| Screen | A whole screen with its router, dialogs and language, the store primed and its actions mocked | next to the screen | `yarn test` |
| Store | `meetingStore` with its logic real and the repository mocked | `src/features/meeting/store` | `yarn test` |
| Rules | `database.rules.json` alone, by raw paths | `src/test/rules` | `yarn test:rules` |
| Integration | The real repositories against the emulators with the real rules, signed in as made-up users | `src/test/integration` | `yarn test:rules` |
| End to end | The app in Chromium, desktop and phone, on the emulators | `e2e/` | `yarn test:e2e` |

`yarn test:coverage` writes the report to `coverage/` (`index.html` shows
every uncovered line and branch). `yarn test:rules` and `yarn test:e2e` need
Java 21+ for the emulators (`brew install openjdk@21`, then put it first in
`PATH`).

## Helpers

- **`src/test/fixtures.ts`**: typed factories with sensible defaults and
  partial overrides: `makeMeeting`, `makeLiveMeeting`, `makeFinishedMeeting`,
  `makeGoal`, `makeSideTopic`, `makeViewer`, `makeAuthUser`, `makeMember`,
  `makeRequest`, `makeSharedSummary`, `makeAccess`. The times are fixed (`T0`,
  `T_END`) so assertions don't depend on the clock.
- **`src/test/render.tsx`**: `renderWithApp(ui, options)` wraps a screen in
  the dialog provider and a memory router, and primes the stores:
  - `route` and `path` set the URL and the route pattern;
  - `store` and `auth` seed `useMeetingStore` and `useAuthStore` (pass
    `vi.fn()` for the actions the screen calls);
  - `locale` sets the language (English by default);
  - `viewport` (`desktop`, `tablet`, `phone`) stubs `matchMedia`.

  It returns Testing Library's result plus `path()` (the current URL) and
  `user()` (a lazily created `user-event` instance). Both stores and the
  language are reset after every test.
- **`src/test/setup.ts`** stubs what jsdom lacks: `ResizeObserver`, the
  clipboard, object URLs and `scrollIntoView`. It also clears the DOM and
  `localStorage` after each test.
- **`src/test/integration/harness.ts`**: `signInAs(email)` signs the app in
  through the Auth emulator; `peek` and `plant` read and write with the rules
  off; `createEventAs` creates an event through the app's own code.

## End to end

`yarn test:e2e` starts the Auth and Database emulators, then Playwright
starts the app against them (`yarn dev:local` on port 5300) and runs
`e2e/*.spec.ts` in two projects, desktop (1280×800) and phone (iPhone 13).
Each test signs in through the emulator-only "Test sign-in" field on the
landing with a fresh address (`uniqueEmail`), so tests never share data.
Several people at once (sharing, requests) are separate browser contexts
(`personIn`). The first run needs `npx playwright install chromium`.

| Spec | Flow |
| --- | --- |
| `event-lifecycle` | Create from a template, start, tick milestones, park a topic, finish, read the report, reopen |
| `sharing` | Share with a viewer (read-only), a stranger requests access, the owner approves as contributor, who then runs the event |
| `account` | Export the data as JSON, delete the account, sign in again to an empty account (desktop) |
| `responsive` | Home, board and report on a phone: tab bar shown, no sideways scroll |

A failed run in CI keeps the Playwright report and traces as the
`playwright-report` artifact.

## Rules for tests

- **Test what a person sees and does.** Query by role, label and text, not
  by class or internal state. Add an accessible name to the component when a
  query can't find it; never a `data-testid` just for a test.
- **Every test asserts something that matters**: what is on screen, or a
  call or write with the right arguments. Running code only to colour the
  coverage report isn't allowed.
- **A branch that can't happen is removed, not tested or ignored.** These
  simplifications land in their own commits, marked "test-driven
  simplification". A bug a test finds is fixed in its own `fix` commit.
- **Errors a test expects** (for example a failed write that should reach
  the save-error toast) carry `[expected]` in their message. Vitest ignores
  those when they surface as unhandled rejections; any other unhandled error
  fails the run.
- **New code comes with its tests.** Coverage can't drop, so a change
  without tests fails CI.

## Ignored lines

`/* v8 ignore */` is allowed only on lines that can't run in jsdom and are
covered end to end, each with a comment saying why, and listed here.

None so far: every line runs in the unit suite.
