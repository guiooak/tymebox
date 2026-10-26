# Tymebox — Dependency maintenance

## Context

On 2026-10-23 the owner asked for a maintenance pass, following their usual
runbook:

- review every open Dependabot alert and bump PR;
- update everything that can be updated;
- fix any security advisory found.

## Done

- **`1094255` chore(deps):**
  - **Minor and patch updates:** React 19.3.1, ESLint 10.13,
    typescript-eslint 8.72, Vitest 5.0.5 and jsdom 30.1.3.
  - **Major updates, where the fixes only exist there:**
    - `firebase-tools` 13 → 15;
    - `@firebase/rules-unit-testing` 4 → 6.
  - **Transitive packages:** refreshed within their ranges, among them tar,
    undici and protobufjs.
  - **Forced through `resolutions`,** where a parent pins a vulnerable range
    the code doesn't reach:
    - uuid 11 for gaxios;
    - `@opentelemetry/core` 2 for `@google-cloud/pubsub`.
  - **Left on purpose:**
    - body-parser's fix, still inside the 3-day age gate (dev-only);
    - three deprecation notices from third-party packages;
    - firebase 13.1, vite 8.3.5 and zustand 5.0.16, held back by the same
      gate.
- **`dcb2a7a` chore(ci):** the GitHub Actions moved to their current majors,
  as Dependabot proposed: setup-java 6, configure-pages 6,
  upload-pages-artifact 5 and deploy-pages 5.
- **Earlier the same day, in `0d34fb8`:** the two production advisories
  inside the Firebase SDK (websocket-driver, `@grpc/grpc-js`) were pinned to
  their fixed releases.
- **`fa2dbcc` chore(benchmark):** the date-library benchmark moved to moment
  2.31.0 and esbuild 0.28.1.

## Node

- **Engines:** `firebase-tools` 15 and Vitest need Node 24.12 or newer.
  `engines.node` says so, and CI runs Node 24.
- **Owner's machine:** Node was raised to 24.22.1 through asdf, in the
  global `~/.tool-versions`.
- **Emulators:** they now need Java 21. CI installs Temurin 21, and locally
  `brew install openjdk@21` is enough.

## Guard rails kept

- **Age gate:** `.yarnrc.yml` refuses versions published less than 3 days
  ago (`npmMinimalAgeGate: "3d"`).
- **No install scripts:** they are off by default; the packages that really
  need one are allow-listed.
- **CI:** CI fails on a high-severity advisory in production dependencies,
  and Dependabot opens weekly update PRs for npm and GitHub Actions.
