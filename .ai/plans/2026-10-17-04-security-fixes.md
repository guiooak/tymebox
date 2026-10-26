# Tymebox — Finish the security fixes (1–4)

## Context

The user asked for security fixes 1 to 4, with rules tests, committed and pushed
to `main`. Plan mode came on mid-task. This lists what is already done (still
uncommitted) and what is left.

### Done so far (uncommitted, in the working tree)

- **Rules generator moved into the repo.**
  - `scripts/database-rules.py` replaces the scratchpad copy, with a header
    explaining it.
  - `package.json` gains `"rules": "python3 scripts/database-rules.py database.rules.json"`.
  - The generator was first checked to reproduce the committed rules exactly.
- **Fix 1, verified email.**
  - Every email-based check now also requires `auth.token.email_verified === true`.
    That covers member read/edit, own member entry, `sharedWith` read/leave,
    filing and cancelling access requests, and `requestsByOwner`.
  - It is done through a `mine(key)` helper and `VERIFIED` in the generator.
  - `database.rules.json` has been regenerated.
- **Fix 2, avatar URLs.**
  - In the rules, `accessRequests/$id/$key/photoURL` must be `''` or start with
    `https://lh3.googleusercontent.com/`.
  - In the app, `requestPhoto(url)` was added to
    `src/features/meeting/domain/access.ts`, with a unit test in `access.test.ts`.
- **Fix 3, `users/$uid`.** Already validated field by field. No rule change was
  needed; a test now locks it in.
- **Rules tests.** `src/test/rules/database.rules.test.ts` has three new groups:
  unverified emails, request pictures, and your own user node. All 22 pass on
  the new rules. On the old rules 3 fail, which shows the tests catch the gaps.

## Remaining steps

1. **Finish fix 2's app side.** `src/features/meeting/domain/meetingRepository.ts`
   calls `requestPhoto(requester.photoURL)` in `requestAccess`, but doesn't
   import it yet. Add `requestPhoto` to the existing `from './access'` import
   (line ~17).
2. **Fix 4, security headers** in `firebase.json` → `hosting.headers`. Add a
   `"source": "**"` entry next to the existing no-cache regex entry, with:
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `X-Frame-Options: DENY`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
   - `Content-Security-Policy`, allowing:
     - `default-src 'self'`
     - `script-src 'self' 'sha256-<hash of the inline theme boot script in index.html>' https://apis.google.com`
     - `style-src 'self' 'unsafe-inline'` (React inline styles)
     - `img-src 'self' data: blob: https://lh3.googleusercontent.com`
     - `font-src 'self'`
     - `connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasedatabase.app wss://*.firebasedatabase.app https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://apis.google.com`
     - `frame-src https://tymebox-f1a2d.firebaseapp.com https://accounts.google.com` (Google sign-in popup / auth iframe)
     - `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`

   Compute the inline-script hash with
   `openssl dgst -sha256 -binary | base64` over the exact script text that Vite
   emits in `dist/index.html`. Take the Firebase hosts from `.env.example` and
   the CI env vars. Check the real auth domain and database URL in the built
   bundle.
3. **Checks.** Run:
   - `yarn lint`, `yarn typecheck`, `yarn test` and `yarn format:check`;
   - `yarn test:rules`, with Java on PATH (`/opt/homebrew/opt/openjdk@11/bin`);
   - `yarn build`.

   Validate `firebase.json` as JSON.
4. **Verify the CSP doesn't break the app.** It can only be fully proven on
   hosting.
   - Serve the build with `npx firebase-tools@13 emulators:start --only hosting`
     (it applies `firebase.json` headers), or check the header list by eye.
   - In a browser, load the page. Confirm there are no CSP violations in the
     console: the theme boot script, fonts, the Google button, and the
     websocket to the database.
5. **Commit and push**, as two commits:
   - "fix(security): require verified emails for shared access; only Google
     avatars on requests" — covers the rules, the generator, the tests and
     `requestPhoto`;
   - "feat(hosting): security headers (CSP, frame, sniffing, referrer)".

   Both end with the Co-Authored-By line. Push to `origin main`. CI deploys
   rules, then hosting.
6. **Check production after CI.**
   - `curl -sI https://tymebox.web.app/` shows the new headers.
   - In the in-app browser, the landing loads with no CSP errors in the console.
   - Signing in itself needs the user, so ask them to sign in once and say
     whether anything breaks.

   If the CSP blocks something in prod, adjust and push a follow-up quickly.
7. **Report to the user, in Portuguese.**
   - The four fixes:
     1. verified email;
     2. Google-only avatars;
     3. `users/$uid` already safe, now tested;
     4. security headers.
   - The tests: 22 rules tests, with 3 that fail on the old rules.
   - What is left for them in the Firebase/Google Cloud console:
     - confirm only Google is enabled in Authentication → Sign-in method;
     - restrict the browser API key to the tymebox domains;
     - consider App Check to curb scripted abuse.
   - Dependency advisories: only dev tooling and Node-only SDK paths are
     affected. Updating `firebase-tools` (13 → 14) in CI is a possible
     follow-up.

## Verification

- `yarn test:rules` → 22 passing; `yarn test` → all unit tests passing, including
  `requestPhoto`.
- Locally served build (hosting emulator): no CSP console errors; landing,
  sign-in popup (emulator test sign-in), Home and an event board all work.
- Prod: headers present; landing loads clean; user confirms Google sign-in works.

## Outcome

Shipped on 2026-10-17:

- `3ebc529` fix(security): every email-based rule requires a verified email,
  and access requests only keep Google profile photos (`requestPhoto`);
- `49d6d9f` feat(hosting): security headers (CSP with the theme script's hash,
  `X-Frame-Options`, `nosniff`, referrer and permissions policies);
- `9ddaf8a` the HTML is revalidated on every visit, so a deploy reaches
  everyone at once.

The console follow-ups listed here (sign-in providers, the API key
restriction, App Check) were picked up by the LGPD and security work in
`2026-10-23-01-lgpd-compliance.md`.
