# Tymebox — Sharing events and access requests

Implemented 2026-10-17. Parts 1–2 of the working plan (the parking-lot fix and the
collapse arrow) shipped separately in `5dfd6d6` and `fc29c41`.

## Context

Today every event lives under `users/$uid/meetings/$id`, readable and writable
only by its owner (`database.rules.json`), and every screen works on a single
"current" event (`currentMeetingId`, ID-less routes `/events/live`,
`/events/report`). The owner wants events to be shareable:

1. The event id is in the URL of the event's main route.
2. Events are private by default.
3. From the event, the owner shares with specific people **by email** and can
   make the event **public** (anyone with the link).
4. Every access (a person, or the public link) can be removed or set to
   **viewer** (read-only) or **contributor**.
5. The same rules apply to the report once the event is finished.
6. Home gets a **Shared with me** section, separate from the owner's events.
7. Someone who opens a link without access can **request access**. The request
   appears in the event's Share section, where the owner **approves** (choosing
   the role) or **denies** it.

Decisions taken with the owner:
- **Public link → signed-in users only** (any Google account with the link).
- **Contributor runs the event**: everything except sharing and deleting
  (start/finish/cancel, schedule, milestones, notes, parking lot).
- **Shared with me** = events shared with your email **plus** public events
  you've opened.
- **No invite emails**: adding someone grants access; they see it in Shared
  with me; the owner copies the link and sends it themselves.
- **Access requests stay in the app**: the owner sees them as a badge on Share
  and a notice on Home, not by email. That keeps the "no email infrastructure"
  decision.

This supersedes `.ai/plans/2026-06-08-03-collaborative-sharing-and-deep-links.md`.
The big change from that plan: access is **keyed by email**, checked in the
security rules with `auth.token.email` (Google sign-in emails are verified).
That removes the need for Cloud Functions (no email→uid lookup, no admin
fan-out), works for people who have never signed in, and keeps the project on
the free Spark plan.

## A. Data model (Realtime Database)

```
meetings/$id                      event content (readable per access rules)
  owner: uid                      immutable after create
  ownerName: string               shown in "Shared with me"
  name, description, expected/real times, status, createdAt, updatedAt
  goals/$goalId:      { name, weight, finishedAt, decisions, order }
  sideTopics/$pushKey:{ id, value, goalName }   // per-topic since Part 1; push keys keep order

meetingAccess/$id                 who may open it (separate node: see B)
  owner: uid                      public copy, so a requester can address the owner index
  visibility: 'private' | 'public'
  publicRole: 'viewer' | 'contributor'
  members/$emailKey: { email, role: 'viewer' | 'contributor', addedAt }

sharedWith/$emailKey/$id: { addedAt }      "Shared with me" index (invites)

accessRequests/$id/$emailKey:              one pending request per person per event
  email, name, photoURL, message (≤ 280), requestedAt
requestsByOwner/$ownerUid/$id/$emailKey: true   lets Home count an owner's pending requests
users/$uid/visited/$id: timestamp          public events this user opened
users/$uid/currentMeetingId, settings      unchanged ("resume" pointer, prefs)
```

- **`$emailKey`** = lowercased email with `.` → `,` (the usual Firebase key
  encoding). Emails containing `# $ [ ] /` are rejected in the UI. The rules
  compute the same key: `auth.token.email.toLowerCase().replace('.', ',')`.
- **Goals become a keyed map with an `order` field**, not an array. Side
  topics already moved to per-topic writes in Part 1. Each edit writes one goal
  (`goals/<id>/finishedAt`), so two contributors checking different milestones
  no longer overwrite each other. Reordering rewrites only the `order` of the
  moved items. `normalizeMeeting` in `meetingRepository.ts` sorts by `order`,
  and its `toArray` already accepts maps.
- Access lives in its own node because RTDB read rules cascade. If members sat
  inside `meetings/$id`, anyone with a public link could read every invitee's
  email.

## B. Security rules (`database.rules.json`)

Helpers, written inline in the rules:
- `isOwner` = `root.child('meetings/'+$id+'/owner').val() === auth.uid`
- `myKey` = `auth.token.email.toLowerCase().replace('.', ',')`
- `myRole` = the member role at `meetingAccess/$id/members/myKey/role`, or the
  `publicRole` when `visibility === 'public'`.

| Path | Read | Write |
|---|---|---|
| `meetings` (list) | query `orderByChild('owner').equalTo(auth.uid)` only (`.indexOn: owner`) | — |
| `meetings/$id` | owner, a member, or anyone signed in if public | create only with `owner === auth.uid`; delete by owner |
| `meetings/$id/owner`, `ownerName` | (inherits) | owner only; `owner` immutable |
| `meetings/$id/*` content | (inherits) | owner, or `myRole === 'contributor'`; keep today's per-field `.validate` + `$other: false`, moved to the new shape (`goals/$goalId`, `sideTopics/$topicId`, `order` is a number) |
| `meetingAccess/$id/owner`, `visibility`, `publicRole` | anyone signed in (needed to resolve your role and to request access) | owner only, with enum validation; `owner` must equal `meetings/$id/owner` |
| `meetingAccess/$id/members` | owner (whole list); a member reads **only their own** entry | owner only; role enum, email ≤ 254 chars |
| `sharedWith/$emailKey/$id` | the holder of that email | owner of `$id` adds/removes; the holder may remove (leave) |
| `accessRequests/$id/$emailKey` | the owner of `$id` (all); the requester (own entry only, to show "Request sent") | requester creates/cancels **only their own key** (`$emailKey === myKey`, `email === auth.token.email`, `meetings/$id` exists, they aren't the owner, text limits); the owner deletes (approve/deny) |
| `requestsByOwner/$ownerUid/$id/$emailKey` | `$ownerUid` | requester writes/removes their own key only if `$ownerUid` is the event's owner; the owner removes |
| `users/$uid/**` | self | self (`visited/$id` = number) |

Contributors can never write `owner` or anything under `meetingAccess`. That's
enforced by rules, not just hidden in the UI. During migration (section C) the
old `users/$uid/meetings` rules stay in place, then are removed.

## C. Migration of existing events (client-side, on sign-in)

`migrateLegacyMeetings(uid, profile)` in `meetingRepository.ts` runs from
`bind`. For each `users/$uid/meetings/$id`:
1. Skip it if `meetings/$id` already exists (idempotent).
2. Write `meetings/$id` with `owner` and `ownerName`, converting the goals and
   side-topics arrays into keyed maps with `order`. Ids are kept, so links and
   `currentMeetingId` survive.
3. Write `meetingAccess/$id = { owner: uid, visibility: 'private', publicRole: 'viewer' }`.
4. Remove the legacy node.

The transform is pure and covered by unit tests. One multi-path `update()` per
event keeps each event all-or-nothing.

## D. Routes and loading by id

- **Paths.** `src/common/services/router/paths.ts` gains builders:
  - `paths.event(id)` → `/events/:id`: the live board, the event's main route
    (requirement 1);
  - `paths.eventReport(id)` → `/events/:id/report`;
  - keeps `home`, `newMeeting` (`/events/new`) and `meetings` (`/events`).
- **Redirects.** The old `/events/live` and `/events/report` (and the
  `/meetings/*` aliases in `legacyRedirects`) redirect to the current event's id
  when there is one, otherwise to Home.
- **Loading.** `MeetingDashboard` and `MeetingReport` read `:id` via the
  existing `useRouteParams` and open that event. A finished event on `/events/:id`
  redirects to its report, and an unfinished one on `/report` redirects back, as
  today.
- **No access or missing.** One page for both cases, "You don't have access to
  this event", with a **Request access** action (section I). Today `subscribe`
  in `src/common/services/database/database.ts` has no error callback; add one
  so `permission_denied` reaches the UI instead of an endless loader.
- **Every link that builds an event URL** switches to the builders: Home,
  History, the sidebar's "Live event", the form after create/clone/template,
  and the report buttons (about 19 call sites of `paths.liveMeeting` /
  `paths.report`).

## E. Store (`src/features/meeting/store/meetingStore.ts`)

- **`bind(uid, email)`** subscribes to three things:
  - your own events (the owner query) → `meetings`;
  - the user node → `currentMeetingId`, settings, `visited`;
  - `sharedWith/<yourKey>` → `sharedIds`.

  It then runs the migration.
- **`openEvent(id)` / `closeEvent()`** subscribe to `meetings/$id` and
  `meetingAccess/$id` (visibility + your own member entry; the full list only
  for the owner). They expose `event`, `access` and `role`. Opening a public
  event you don't own records `users/$uid/visited/$id`.
- **Actions take the event id**, not `currentMeeting`, and write fine-grained
  paths:
  - `updateGoal` writes `goals/<id>/<field>`;
  - `addGoal` writes `goals/<newId>`, with `order` set to max + 1;
  - `removeGoal` sets that path to null;
  - `reorderGoals` writes the affected `order` values;
  - side topics are handled the same way.

  `startMeeting`, `finishMeeting` and the rest keep their logic.
  `currentMeetingId` stays as the owner's "resume" pointer.
- **Sharing actions** (owner only):
  - `setVisibility(id, visibility, publicRole)`;
  - `shareWith(id, email, role)`, which writes the member entry and
    `sharedWith/<key>/<id>` in one multi-path update;
  - `setMemberRole`;
  - `unshare`, which removes both.
- **Shared list.** A `sharedEvents` selector, fed by small per-id
  subscriptions, resolves `sharedIds ∪ visited` into event summaries: name,
  owner, status and your role. Ids that come back `permission_denied` (access
  removed) are dropped from the list and from `visited`.
- **New pure domain module** `src/features/meeting/domain/access.ts`, with tests:
  - `emailKey(email)`;
  - `isValidShareEmail(email)`;
  - `roleFor(event, access, user)` → `'owner' | 'contributor' | 'viewer' | null`;
  - `can(role, action)` for `share | delete | run | edit | view`.

## F. Share UI

- **Share button.** It sits in the dashboard header next to the status badge,
  and in the report header.
  - **Owner:** it opens the Share modal. The modal is built on the existing
    `Modal` in `src/common/components/overlay/Modal.tsx`, which now aligns its
    title and X.
  - **Everyone else:** a chip reads "Shared by Ana · You can view /
    contribute", with Copy link.
- **Share modal** (new `src/features/meeting/share/ShareModal.tsx`), with four
  parts. The fourth, **Requests**, sits at the top whenever there are pending
  requests (section I):
  - **Link:** a read-only URL plus "Copy link".
  - **General access:** a select between "Private: only people added" and
    "Anyone with the link (signed in)". When public, a role select offers
    Viewer or Contributor.
  - **People:**
    - an email input plus a role select and an Add button;
    - validation for a malformed email, a duplicate, or your own email;
    - one row per member, showing the email, a role select and Remove;
    - the owner row at the top, not editable;
    - the copy "They'll see it under Shared with me after signing in with this
      email."

  Every change saves immediately (the rules validate it). It reuses `Switch`,
  `Button`, `Badge` and the form components.

## G. Role-aware dashboard and report

- **Viewer**, read-only:
  - `InlineEdit` is disabled;
  - `DashboardSchedule` gets `readOnly`, a prop that already exists;
  - `GoalsDecisionCollector` gets `editable={false} disabled` (both exist);
  - `DashboardSideTopics` and `PostIt` get a read-only mode;
  - no Start/Finish/Cancel buttons, and keyboard shortcuts are off;
  - a "View only" badge in the header.
- **Contributor:** everything the owner has except Share and Delete.
- **Report** follows the same rules:
  - a viewer can read, Copy report and Download chart;
  - only the owner and contributors see "Back to dashboard";
  - "Start new event" stays, but creates the viewer's own event.
- **Time alerts** (`ThresholdAlertsWatcher`) keep following *your*
  `currentMeetingId`, so following a shared live event doesn't change your own
  resume pointer.
- **Home and History metrics:** they count **own events only**.

## H. Home: "Shared with me"

- **Where:** a new section in `src/features/meeting/home/Home.tsx`, below
  Recent events, built from `sharedEvents` and sorted live-first, then newest.
- **Each row:** event name, "by {ownerName}", a role chip (View / Contribute),
  status (Live / Setting up / Finished), and an Open button that goes to
  `/events/:id` or its report.
- **Empty state:** "Nothing shared with you yet", using the existing
  `BlankSlate`.
- **Loading:** hidden while loading, using the store's `loading` flag, the same
  way the other sections now handle it.

## I. Access requests

**Requester.** They open `/events/:id` with no access.
1. The no-access page says "You don't have access to this event. Ask the owner
   for access." It offers an optional message (≤ 280 chars) and a **Request
   access** button.
2. Sending writes `accessRequests/$id/<myKey>` and
   `requestsByOwner/<owner>/$id/<myKey>` in one multi-path update. The owner uid
   is read from a tiny public projection: `meetingAccess/$id/owner`, a copy of
   `meetings/$id/owner` that is readable by anyone signed in, so a requester
   never reads the event.
3. The page then shows "Request sent. You'll be let in as soon as the owner
   approves," with **Cancel request**.
4. The page keeps listening to its own request and its own member entry:
   - **approved:** the member entry appears and the request disappears, so the
     page **opens the event on its own** and it shows up under Shared with me;
   - **denied:** the request disappears without membership, so the page shows
     "The owner didn't approve your request," with the option to ask again.
5. A missing id gets the same page. Sending then fails the rules check
   (`meetings/$id` must exist) and shows "Couldn't send the request." Event ids
   are unguessable push keys, so this reveals nothing useful.

**Owner.**
- **Badge:** while the event is open, the dashboard and report subscribe to
  `accessRequests/$id`. The **Share** button shows a count badge when requests
  are pending.
- **Share modal:** a new **Requests** section sits at the top, newest first.
  Each row shows the avatar or initial, name, email, message and "x min ago",
  with a role select (default **Viewer**) and **Approve** / **Deny**.
  - **Approve** is one multi-path update: write
    `meetingAccess/$id/members/<key>`, write `sharedWith/<key>/$id`, and remove
    the request plus its `requestsByOwner` entry.
  - **Deny** removes the request and its index entry.
- **Home:** while signed in, Home subscribes to `requestsByOwner/<uid>`. When
  requests are pending it shows a notice, "3 people are asking for access", that
  links to each event and opens Share.

**Store.**
- Requester side: `requestAccess(id, message)`, `cancelAccessRequest(id)` and
  `watchMyRequest(id)`.
- Owner side: `approveRequest(id, emailKey, role)` and
  `denyRequest(id, emailKey)`, plus `pendingRequests` for the open event and
  `pendingRequestCount` from `requestsByOwner`.
- All of these sit next to the sharing actions in section E.

**Edge cases.**
- **Public link:** a signed-in person already has access, so they never see the
  request page. Asking to go from viewer to contributor is out of scope for
  this version.
- **Already a member:** if someone requests while already a member (an approval
  raced their tab), the rules reject the write (`members/<myKey>` must not
  exist) and the page simply opens the event.
- **Spam:** each person has one request per event (the key is their email), so
  a re-request overwrites instead of piling up.

## J. Local testing with real rules (Firebase emulators)

- **Dev dependencies:** add `firebase-tools` and `@firebase/rules-unit-testing`.
- **Config:** `firebase.json` gains `emulators.auth` and `emulators.database`.
- **App wiring:** when `VITE_USE_EMULATORS=1`, `firebaseApp.ts` and `auth.ts`
  call `connectDatabaseEmulator` / `connectAuthEmulator`. The Auth emulator
  lets two fake Google users sign in locally, which the in-memory fake can't
  do, and real rules apply.
- **Rules tests:** a `yarn test:rules` script runs
  `src/test/rules/*.test.ts` against the emulator. They cover the matrix
  owner / contributor / viewer / public-signed-in / stranger × read / write
  content / write access / write owner / share index.
- **CI:** a new job in `ci.yml` with `actions/setup-java`, since the emulator
  needs Java 11+.

## Rollout order (production safety)

Pushing `main` deploys hosting automatically, but **rules are not deployed by
CI** (`deploy.yml` is hosting-only). So:

1. Commit the work on `main` phase by phase, and **don't push until the rules
   are live**. A client that writes `meetings/$id` against today's rules would
   fail. This is an exception to the push-freely preference, for this feature
   only.
2. The owner deploys the new rules: `firebase deploy --only database`. That
   needs their Firebase login; Claude can't do it from here. Old and new paths
   both work at this point.
3. Push: hosting deploys, and each user's events migrate on their next sign-in.
4. Once migrated (in practice just the owner's account), a small follow-up
   removes the legacy `users/$uid/meetings` rules.

## Critical files

- **Rules and config:** `database.rules.json`, `firebase.json`, `package.json`,
  `.github/workflows/ci.yml`
- **Services:**
  - `src/common/services/database/{database,firebaseApp}.ts`: query support,
    multi-path update, error callback, emulator
  - `src/common/services/auth/auth.ts`
  - `src/common/services/router/paths.ts`
- **Domain:**
  - `src/features/meeting/domain/{types,meetingRepository}.ts`: new shape,
    queries, migration
  - new `domain/access.ts`
- **Store:** `src/features/meeting/store/meetingStore.ts`
- **Screens:**
  - `src/app/AppShell.tsx`: routes, redirects, no-access page
  - `src/features/meeting/dashboard/*`, `report/*`, `home/Home.tsx`,
    `history/MeetingsHistory.tsx`, `form/MeetingForm.tsx`, `app/AppSidebar.tsx`
- **New:** `src/features/meeting/share/ShareModal.tsx` (+ CSS module)
- **Docs:** README (sharing, emulators, rules deploy step); mark the June plan
  as superseded.

## Verification

1. **Unit tests**, with `yarn test`:
   - `emailKey` and email validation;
   - `roleFor` / `can`;
   - the migration transform (arrays → ordered maps, ids kept);
   - `normalizeMeeting` ordering;
   - path builders and redirects.
2. **Rules tests**, with `yarn test:rules` against the emulator:
   - **Stranger:** no read on a private event, no write.
   - **Viewer:** read; no content write.
   - **Contributor:** content write; no `meetingAccess` or `owner` write.
   - **Public link, signed in:** read, or write when `publicRole` is
     contributor.
   - **Members list:** a member can't list the others.
   - **`sharedWith`:** only the owner adds, and the holder can leave.
   - **Requests:** only your own key, only for an existing event you don't own
     and aren't a member of. The owner reads and deletes them; nobody else
     reads them.
3. **Two users in emulator mode** (`VITE_USE_EMULATORS=1`, accounts A and B):
   - A creates an event: the URL is `/events/<id>` and B opening it gets the
     no-access page.
   - A shares with B as viewer: B sees it under Shared with me, the dashboard
     is read-only, and live updates arrive as A checks milestones.
   - A upgrades B to contributor: B starts, checks and edits, and both screens
     update without overwriting each other's milestones.
   - A removes B: B's open tab drops to no-access and the event leaves the
     list.
   - A makes it public as viewer: a third account C opens the link, sees it
     read-only, and finds it under Shared with me.
   - A finishes: the report follows the same rules for B and C.
   - Access requests:
     - C (no access) opens a private link, sees Request access and sends it
       with a message;
     - A sees the badge on Share and the notice on Home, then approves C as
       viewer;
     - C's tab opens the event on its own and it appears under Shared with
       me.
   - D requests and A denies: D sees "didn't approve" and can ask again.
   - Rules: D can't write a request under someone else's email, can't read
     other requests, and can't approve themselves (no write to
     `meetingAccess`).
4. **Migration:** seed legacy `users/$uid/meetings` data in the emulator, sign
   in, and confirm the events moved with ids, goals and times intact, and that
   Home and History still show them.
5. **Checks:** `yarn lint`, `yarn typecheck` and `yarn build` stay green.

---

## Outcome (2026-10-17)

Shipped as planned, with these adjustments:

- **`sharedWith/$emailKey/$id` also stores the `role`**, so "Shared with me"
  shows View/Contribute without an extra listener per event.
- **Creating an event writes `meetingAccess/$id` in the same multi-path
  update.** RTDB only grants a write from rules at that path or above, so the
  node needs a create rule for the event's own owner.
- **Old events are trimmed to today's limits when they move**, so no event's
  move is refused (and the event left out of the app).
- **CI:**
  - a `test-rules` job runs the emulator tests;
  - hosting now deploys **after** `deploy-rules`, so the client and the rules
    switch together.
- **Sign-in round trip:** a shared link opened while signed out goes to Login
  and comes back to the link after sign-in.
- **Emulator mode** (`yarn dev:emulators` + `yarn dev:local`) adds a test
  sign-in on Login, used to verify everything end to end with two accounts on
  two origins:
  - request, approve as contributor (the page opened on its own), and live
    edits;
  - demote to viewer (read-only live, and the rules refuse a forced write);
  - remove (the page fell to no-access);
  - deny ("didn't approve", ask again);
  - make public (the page opened, listed as "Public link");
  - finish (the viewer sees the report read-only);
  - legacy migration.
