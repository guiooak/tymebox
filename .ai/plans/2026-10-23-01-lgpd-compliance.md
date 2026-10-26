# Tymebox — LGPD compliance

## Context

Tymebox processes personal data of Brazilian users. That makes it subject to
the LGPD (Lei 13.709/2018), even as a free side project. Today:

- **Transparency:** there's no privacy policy.
- **Data subjects' rights:** there's no way to delete one's account or export
  one's data. Deleting a single event works.
- **Data collected:**
  - the Google account: name, email, photo and `uid` (Firebase Auth);
  - events, with milestones, notes and side topics;
  - the emails of the people an event is shared with;
  - access requests, holding name, email, photo and a message;
  - preferences, the event in progress and visits to shared events;
  - in the browser's localStorage, essentials only.
- **What isn't there:** analytics, ads or tracking cookies.
- **International transfer:** the database is on `*.firebaseio.com`, which
  is the US (us-central1). So the data leaves Brazil.

The goal is to meet the LGPD's obligations that apply here:
- transparency (art. 9);
- a legal basis for each use (art. 7);
- data subjects' rights (art. 18);
- retention and deletion (art. 15–16);
- security and incident handling (art. 46–48);
- international transfer (art. 33).

All of it in-app, with no backend: the app stays client-only, on Firebase rules.

**Decisions:**
- **Privacy contact channel:** **tymebox@gmail.com**, given by the owner. It
  lives in one config file (`src/features/legal/contact.ts`) used by the
  policy, the terms and the account modal.
- **Controller (default, change if needed):** an individual. The name stays
  as the placeholder `{{CONTROLADOR}}` in the same file, filled in before
  publishing.
- **Pages:** Privacy Policy **and** Terms of Use, both in pt and en.
- **Account deletion:** owned events, shared ones included, are deleted for
  everyone. The confirm dialog says how many shared events will go.

## 1. Privacy Policy and Terms of Use pages (public)

- **Routes:** in `src/common/services/router/paths.ts`, add `/privacidade`,
  `/privacy`, `/termos` and `/terms`. In `src/app/AppShell.tsx`, they're
  reachable signed in or out, unlike `/pt` and `/en`, which redirect.
- **Pages:** `src/features/legal/` (new) holds `PrivacyPolicy.tsx`,
  `TermsOfUse.tsx` and a shared `LegalPage` layout (Container, Page,
  headings, "Last updated"). Content lives in `legal/content/{pt,en}.ts`,
  long-form text kept out of the i18n catalogs. The page picks the language
  with `useLocale()`, so `/privacidade` while signed in as en shows English,
  with a link to the other language.
- **Policy contents, in plain language:**
  1. Who the controller is, and the contact channel (no formal DPO needed: a
     small processing agent under ANPD Resolution 2/2022 only has to offer a
     communication channel).
  2. **Data collected and why, with the legal basis.** A table with these
     rows:
     - the Google account;
     - events;
     - emails of the people you share with;
     - access requests;
     - preferences and visits;
     - localStorage;
     - Firebase's technical logs.

     Legal bases: performing the service (art. 7 V) for the account and
     events, and legitimate interest (art. 7 IX) for third parties' emails
     typed in when sharing, and for security logs.
  3. **Who sees what:**
     - the owner sees the people the event is shared with and the requests;
     - members see the owner's name;
     - a public link opens the event to anyone signed in.
  4. **Processors and transfer:** Google (Firebase Auth, Realtime Database,
     Hosting). The servers are in the US, under Google's standard contractual
     clauses (art. 33 II).
  5. **Retention:**
     - data is kept while the account exists;
     - unanswered requests expire after 30 days (section 4);
     - deleting the account erases everything;
     - Google's backups clear on its own cycle.
  6. **Rights (art. 18)**, each saying how to exercise it in the app:
     - access/export goes to "Export my data";
     - correction: editing the event, with the name/photo changed in the
       Google account;
     - deletion goes to "Delete account";
     - information about sharing goes to item 4;
     - anything else goes to the email, answered within 15 days.
  7. **Cookies/localStorage:** only functional storage (theme, language,
     layout). There's no tracking, so no consent banner is needed. Say so
     explicitly.
  8. **Security:**
     - database rules per event;
     - verified email;
     - CSP;
     - an incident gets notified to the ANPD and to those affected (Resolution
       15/2024).
  9. **Minors:** the service isn't aimed at under-18s.
  10. **Changes to the policy:** notified in the app, with the update date.
- **Terms of Use:** short.
  - The service is free and "as is".
  - Acceptable use: nothing illegal in events, no attempts to circumvent
    access.
  - Users are responsible for the content and for the emails they share
    with.
  - The service can be ended.
  - Disputes go to Brazilian law and the user's forum (CDC).
- **Links:**
  - the landing footer (`src/features/landing/Landing.tsx`) and the app
    footer (`src/app/AppFooter.tsx`) link "Privacidade · Termos";
  - under the Google button on the landing and `/login`: "Ao entrar, você
    concorda com os Termos e a Política de Privacidade". This is notice, not
    a checkbox: with performance of the service as the legal basis, consent
    isn't required;
  - `sitemap.xml` gets the new URLs.
- **SEO/preview:** `/privacidade` and `/privacy` get their own `<title>` via
  `document.title`. Static HTML isn't needed.

## 2. "Privacy and data" in the account

- **Entry:** a "Privacidade e dados" item opens a modal (`Modal`, a sheet on
  phones):
  - on desktop/tablet, in the sidebar's user block (`src/app/AppSidebar.tsx`,
    next to Sign out; hidden when collapsed, like the theme);
  - on phones, in the account sheet (`src/app/MobileNav.tsx`).
- **The modal shows:**
  - the data on file (name, email, photo from Google, number of events);
  - the actions below;
  - a link to the policy.
- **Component:** `src/features/account/PrivacyAndData.tsx` (new), plus
  `useAccountData` for the counts.

### 2a. Export my data (access and portability, art. 18 II and V)

- **What it does:** `exportMyData(uid, email)` in a new
  `src/features/account/accountRepository.ts` gathers:
  - `users/$uid`;
  - owned events: `subscribeOwnMeetings`' query read once, with
    `meetingAccess/$id` and `accessRequests/$id`;
  - `sharedWith/$myKey`;
  - the requests I filed (index in 2c);
  - the Google account fields;
  - localStorage keys starting with `tw-`.
- **The file:** a `tymebox-dados-AAAA-MM-DD.json` download via a `Blob` and
  `<a download>`.
- **Reuse:** `read()` and `writeMany()` from
  `src/common/services/database`, and `emailKey()` from
  `src/features/meeting/domain/access.ts`.

### 2b. Delete account (deletion, art. 18 VI)

- **Confirmation:**
  1. A confirm modal (the pattern of the event-delete confirm) lists what
     goes: N events, M of them shared with other people.
  2. To confirm, the user types "EXCLUIR" / "DELETE".
- **Order of operations in `deleteAccount(user)`:**
  1. **Reauthenticate** with `reauthenticateWithPopup` (Firebase requires a
     recent login for `deleteUser`). It's a new helper in
     `src/common/services/auth/auth.ts`, which is also the right moment to
     cancel cleanly.
  2. **Owned events:** for each, `deleteMeetingEverywhere(meeting)`
     (`meetingRepository.ts:225`), which already clears `meetingAccess`,
     everyone's `sharedWith` and the requests.
  3. **Where I'm a member:** for each `sharedWith/$myKey/$id`, remove
     `meetingAccess/$id/members/$myKey` and then `sharedWith/$myKey`. **This
     needs a new rule (section 3).**
  4. **Requests I filed:** for each id in `users/$uid/requested`, remove
     `accessRequests/$id/$myKey` and
     `requestsByOwner/$owner/$id/$myKey`. Both are already allowed for the
     requester.
  5. Remove `users/$uid`.
  6. Run `deleteUser(auth.currentUser)`, clear the `tw-*` keys from
     localStorage, and send the user to the landing with a toast saying the
     account was deleted.
- **Partial failure:** the steps are idempotent. If something fails before
  step 6, the account still exists and the user can try again; the error
  says so.

## 3. Rules (`scripts/database-rules.py` → `yarn rules`)

- **`meetingAccess/$id/members/$key`:** allow `mine('$key') &&
  !newData.exists()`. The member can **leave** an event (delete only their
  own entry). It's also used by account deletion. Optional: a "Leave event"
  button in the ⋮ of "Shared with me", one line of extra UI.
- **`users/$uid/requested/$id`:** a new index with `newData.val() === true ||
  !newData.exists()`, written by `requestAccess` (`meetingRepository.ts:462`)
  and cleared by `cancelAccessRequest`, approve and deny.
  - **Approve/deny limitation:** the owner can't write to the requester's
    `users/`, so stale entries are tolerated and dropped when read.
  - **Old requests** (from before the index) are covered by the 30-day expiry
    in section 4.
- **Rules tests:** in `vitest.rules.config.ts`, a member can delete their
  own entry but not someone else's; the requester can write and delete their
  own `requested` entry.

## 4. Retention and minimisation

- **Access requests expire after 30 days.**
  - When the owner loads Home, `subscribeRequestsByOwner` filters out those
    with `requestedAt` > 30 days and deletes them (`denyRequest`, already
    there).
  - When the requester loads, their own expired request is also cleared.
  - The policy states the 30 days.
- **Keep the photo** in requests (it fills the avatar; the owner decided so).
  It's only a Google link, and goes away with the request.
- **No duplicate email in `members`:** not changed. The `email` field keeps
  the original form of the address (the key replaces `.`); it's cheap and
  isn't a new purpose.

## 5. Internal documents (not in the app)

- **`docs/privacy/registro-de-operacoes.md` (art. 37):** each piece of data
  with its purpose, legal basis, where it's stored, retention and who has
  access. It follows ANPD's simplified template for small processing agents.
- **`docs/privacy/incidentes.md`:**
  - what counts as an incident;
  - how to assess it;
  - who to notify: the ANPD and those affected, within 3 business days of
    becoming aware (Resolution 15/2024), with the ANPD form link and a
    message template;
  - how to revoke access: Firebase rules and keys.
- **README:** links to both documents and to the policy.

## 6. Security against leaks (art. 46)

Already in place:
- the database is closed by default;
- per-path rules with field validation;
- `email_verified` is required;
- a strict CSP;
- rules tests gating deploy in CI;
- Yarn with install scripts off and a 3-day age gate.

The Google and GitHub accounts already have strong passwords and 2FA.

- **Negative rules tests:** for every node (`meetings`, `meetingAccess`,
  `sharedWith`, `accessRequests`, `requestsByOwner`, `users`), test that
  signed-out, a stranger and a viewer can't read or write what they shouldn't.
  Also test that listing `meetings` without the owner filter is denied, and
  that `users/$other` is closed. A rule that opens too much then fails
  `yarn test:rules` and blocks the deploy.
- **CODEOWNERS:** `.github/CODEOWNERS` covering `scripts/database-rules.py`,
  `database.rules.json` and `firebase.json`.
- **App Check:** `firebase/app-check` with the reCAPTCHA Enterprise
  provider, initialised in `src/common/services/database/firebaseApp.ts`
  before the database.
  - **Development:** on the emulators and in dev, it uses the debug token
    (`self.FIREBASE_APPCHECK_DEBUG_TOKEN`).
  - **CSP:** add `https://www.google.com`,
    `https://www.gstatic.com/recaptcha/` and
    `https://content-firebaseappcheck.googleapis.com` to `script-src`,
    `frame-src` and `connect-src`, and update `src/test/csp.test.ts`.
  - **Enforcement:** the Realtime Database's enforcement is switched on in the
    console by the owner only after a few days of monitoring metrics, so
    nobody is locked out.
- **Dependencies:**
  - `.github/dependabot.yml` (npm and GitHub Actions, weekly);
  - a CI step running `yarn npm audit --severity high --environment
    production` that fails the build.
- **Owner's checklist (console, not code):**
  - [x] Google and GitHub with strong passwords and 2FA.
  - [x] The project is under `tymebox@gmail.com` (the Spark plan, so budget
    alerts and backups don't apply).
  - [x] CI now deploys with the dedicated service account `github-deploy`:
    API Keys Viewer, Firebase Hosting Admin, Firebase Realtime Database
    Admin and Service Usage Consumer. The deploy succeeded on 2026-10-23.
  - [x] `firebase-adminsdk-fbsvc` has no keys (checked 2026-10-23).
  - [x] Add `guibrancopc@gmail.com` as a second Owner of the project.
  - [x] Secret Protection and Push protection on in the GitHub repo.
- **CI comment:** in `.github/workflows/ci.yml` (deploy-rules), document the
  minimum roles of `github-deploy`.

## i18n

- **Catalogs (`messages/en.ts` and `ptBR.ts`):** strings for the footer,
  login notice, account modal, export and deletion.
- **Policy text:** in `legal/content/`, with the same structure in both
  languages and a test that compares the section ids.

## Tests

- **`accountRepository`, with `common/services/database` mocked:**
  - deletion produces exactly the expected paths (owned events, own entries in
    others' events, filed requests, `users/$uid`) and calls `deleteUser` last;
  - export contains every node.
- **`PrivacyAndData`:** confirmation requires typing the word; Cancel does
  nothing; the counts show.
- **Legal pages:** `/privacidade` and `/privacy` render signed in and signed
  out; the footers link to them.
- **Requests:** expired ones get filtered and deleted.
- **Rules:** the new cases in section 3, via `yarn test:rules`.

## Verification

1. Run `yarn lint`, `typecheck`, `test`, `test:rules` and `build`.
2. **End to end on the emulators** (scratchpad CDP scripts):
   1. user A creates 2 events and shares one with B;
   2. B requests access to the other one;
   3. B exports, and the JSON shows the share and the request;
   4. B deletes the account: their entry leaves A's event and the request
      disappears;
   5. A deletes the account: the events, `meetingAccess` and `sharedWith`
      entries all go;
   6. check that no node with A's `uid` or email is left in the emulator UI's
      database dump.
3. **Visual:**
   - the policy pages, the modal and the confirm, in light/dark and on
     phone/desktop;
   - the links in both footers and under the Google button.
4. **After deploy:**
   - the owner fills in the controller's name before publishing;
   - try `/privacidade` while signed out in production.

## Rollout

One commit per part, in order:
1. rules and index, plus negative rules tests and CODEOWNERS;
2. account (export and deletion);
3. legal pages and links;
4. request expiry;
5. Dependabot, audit in CI and App Check (enforcement turned on later by the
   owner);
6. internal docs.

Push after each part; part 3 only once the controller's name is filled in.

*This plan covers what the LGPD asks of the product. It isn't legal advice;
a lawyer's review of the final text is advisable before publishing.*

## Outcome

Shipped on 2026-10-23.

**What the app keeps.** Name, email and Google profile photo (from the
Google account), plus the person's events, shares, access requests and
settings. Nothing else is collected.

**Commits:**

- **`6d30cf8` rules:**
  - members can leave an event;
  - `users/$uid/requested` indexes the requests a person filed, so deleting
    the account can withdraw them;
  - leak tests: a stranger can't list or read other people's data.
- **`f3e625e` "Privacy and data" in the account menu:**
  - a JSON export of everything the person owns or filed;
  - account deletion after typing DELETE. It removes their events
    everywhere, their place in shared events, their requests, their user
    node and the sign-in account itself.
- **`1a715bf`** the Privacy Policy and Terms of Use, at `/privacidade`,
  `/privacy`, `/termos` and `/terms`.
- **`52123ab`** the controller is "Tymebox", reached at tymebox@gmail.com.
- **`acc2393`** unanswered access requests expire after 30 days. The owner's
  session sweeps them.
- **`0d34fb8`:**
  - Dependabot for npm and GitHub Actions;
  - CI fails on a high-severity advisory in production dependencies;
  - App Check with reCAPTCHA Enterprise. The key comes from
    `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`; App Check is off on the emulators
    and when no key is set.
- **`f973a2a`** the internal documents in `docs/privacy/`: the record of
  processing operations and the incident-response plan.

**Manual security steps, done by the owner with guidance:**

- the Firebase project `tymebox-f1a2d` lives under tymebox@gmail.com;
  guibrancopc@gmail.com was added as an Owner;
- CI deploys with a dedicated `github-deploy` service account (Firebase
  Hosting Admin, Firebase Realtime Database Admin, Service Usage Consumer,
  API Keys Viewer) instead of the `firebase-adminsdk` account. That
  account's keys were deleted;
- GitHub Secret Protection and push protection are on;
- the Google and GitHub accounts use strong, unique passwords and 2FA.

**Later finding (2026-10-25).** The new emulator integration tests showed
the 30-day sweep failing for an owner with a deleted event: it removed the
whole index node, which the rules don't allow, so the batch was refused.
Fixed in `5242e6c` by deleting the stale entries one key at a time.
