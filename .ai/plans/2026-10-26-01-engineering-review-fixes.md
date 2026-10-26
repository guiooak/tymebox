# Tymebox — Engineering review fixes

## Context

On 2026-10-26 an engineering review found a few layering leaks and small
duplicates. They were fixed before the larger refactors (the store,
repository and component splits that followed the same day), so those could
build on clean boundaries. None of the fixes changes the UI.

## Done

- **`9a80956` refactor(download):** `PrivacyAndData` had its own Blob +
  `<a download>` helper. `common/services/download` now has `downloadBlob`
  and `downloadJson`, with tests, and the account export uses
  `downloadJson`.
- **`3706140` refactor(clipboard):** `TemplatePreviewModal`, `ShareButton`
  and `ShareModal` called `navigator.clipboard.writeText` directly.
  `common/services/clipboard` now has `copyText`, with a test. All three use
  it, and `copyRich` falls back to it when it can only copy plain text.
- **`f828c3d` refactor(preferences):** the landing page imported
  `ThemeToggle` and `LanguageSelect` from `src/app/`, so a feature depended
  on the shell. Both moved, with their CSS, to a new `features/preferences`.
  Not to `common/components`: `LanguageSelect` uses the meeting store, and
  `common` must not import features.
- **`0c14c4f` refactor(meeting):** `accountRepository` imported three files
  from `meeting/domain`. A new `features/meeting/index.ts` exports what other
  features may use (`normalizeMeeting`, `RawMeeting`,
  `deleteMeetingEverywhere`, `emailKey`), and account imports only from it.
  This commit also picked up some unfinished files from the parallel store
  split; `15b766e` completed them.
- **`5f99c3a` refactor(select):** the scroll-into-view effect in `Select`
  had an `exhaustive-deps` suppression. It now builds the option id from
  `baseId` and lists it as a dependency. `baseId` never changes, so the
  behaviour is the same.

## Rules written down

The README's Architecture section now states the dependency direction:

- `src/app/` may import any feature; nothing imports `src/app/`.
- Features import `common/` and each other's public `index.ts`, never
  another feature's internal folders.

ESLint doesn't enforce these yet; only the wrapped libraries are checked.

## Checks

`yarn lint`, `yarn typecheck`, `yarn format:check`, `yarn test` (767 tests,
coverage at 100%) and `yarn build` all passed on the pushed tree.

Two sessions running `yarn test:coverage` in the same checkout at the same
time share `coverage/` and break each other's reports. Give a parallel run its
own `--coverage.reportsDirectory`.
