# Tymebox — Versioned production deploys

## Context

Every push to `main` deploys to production, but nothing records which code is
live: there are no tags, no releases, and the app doesn't say what version it
runs. The owner wants each production deploy versioned on GitHub, and the
version shown discreetly in the app: at the foot of the sidebar, only while it
is expanded, in small, muted type.

## Decisions

- **Semantic versions, computed from the commits.** The repo already writes
  Conventional Commits. Since the last `v*` tag: a `!` after the type or a
  `BREAKING CHANGE:` footer bumps the major, any `feat` the minor, anything
  else the patch. Every production deploy gets a version, even a docs-only
  one, so "what is live" always has an answer.
- **First version: 1.0.0.** The app is public with real users. With no tag yet,
  the version is `package.json`'s `version`, set to `1.0.0`. After that the
  tags are the source of truth, and `package.json` isn't bumped (no bot
  commits to `main`).
- **A GitHub Release per deploy**, tagged `vX.Y.Z` on the deployed commit,
  created after the hosting deploy succeeds. A failed deploy leaves no tag,
  and the next run takes the same number. Its notes list the commits since
  the last release, grouped into Features, Fixes and Other changes.
- **Only `main` deploys live.** The live step used to run for any non-PR event,
  so a manual run from another branch would have shipped that branch. Now
  both the live deploy and the rules deploy require `refs/heads/main`, from a
  push or a manual run.
- **One run per ref at a time.** A workflow-level `concurrency` group queues
  runs on `main`, so two quick pushes can't compute the same version. On PRs a
  new push cancels the older run.
- **PR previews show the version they would become**, `X.Y.Z-pr.N`; local
  builds show `dev`.
- **In the app:** `VITE_APP_VERSION` is set at build time. The sidebar footer
  shows it beside the collapse button, in extra-small muted type, only while
  the sidebar is expanded. A released version links to its GitHub Release
  (the repo is public); previews and `dev` are plain text. The phone layout
  has no sidebar and shows nothing.

## Pieces

1. `scripts/release-version.ts`: pure functions (`bumpFor`, `nextVersion`,
   `releaseNotes`) plus a CLI that reads git and writes `version` to
   `$GITHUB_OUTPUT` and the notes to a file. Tests in
   `src/test/releaseVersion.test.ts`.
2. CI: a `version` job (full history and tags) feeds `build` (as
   `VITE_APP_VERSION`) and `deploy`; `deploy` gets `contents: write` and
   runs `gh release create` after the live deploy.
3. App: `src/app/appVersion.ts` turns the build's version into a label and an
   optional link; `AppSidebar` shows it in its footer. Tests for both.
4. README: how releases work.

## Checks

`yarn lint`, `yarn knip`, `yarn typecheck`, `yarn format:check`,
`yarn test:coverage` (100%) and `yarn build`. The workflow itself only runs on
GitHub: the first push to `main` after merging should create `v1.0.0`.
