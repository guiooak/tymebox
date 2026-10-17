# Tymebox — Brazilian Portuguese (pt-BR) alongside US English

## Context

The whole app is written in English (en-US): about 350–450 interface strings
spread across roughly 50 files, plus dates formatted with date-fns in English
("Saturday, October 17th 2026, 14:51h"). The owner wants the app fully
available in **Brazilian Portuguese**, keeping English, with:

- a **language selector in the landing page header, to the left of the
  light/dark toggle**;
- the choice saved in **localStorage while signed out**;
- the choice saved in the **user's profile in the database once signed in**.

## Decisions (recommended defaults)

- **No i18n library.**
  - Typed message catalogs, a small store and a `useT()` hook.
  - The app is small. TypeScript then catches a missing pt-BR string at build
    time, and we avoid a new runtime dependency, consistent with the repo's
    supply-chain posture.
  - The browser covers what a library would add:
    - plurals with `Intl.PluralRules`;
    - numbers with `Intl.NumberFormat`;
    - dates with date-fns's `ptBR` / `enUS` locales, since date-fns is already a
      dependency.
- **First visit:** if nothing is saved yet, use the browser language, so `pt*`
  gives pt-BR and anything else gives en-US.
- **Signed in:** the selector also sits in the sidebar footer, left of the theme
  toggle, so people can change it inside the app too.
- **What gets translated:**
  - **Translated:** everything the app writes, including dialogs, toasts, the
    texts of browser notifications, the "Copy report" text, the templates (their
    names and starter milestones, translated when the event is created), the
    landing page, and `<html lang>`.
  - **Not translated:** what people type (event names, milestones, notes) and the
    brand ("Tymebox").
  - **Unchanged:** route paths stay as they are (`/events/…`). They're shared
    links, so they must not depend on the language.
- **Meta tags in `index.html`** (title, description, Open Graph) stay in English.
  Link previews come from crawlers that don't run the app, so a localised
  `<title>` is set at runtime instead (`document.title`).

## A. i18n core (`src/common/services/i18n/`)

- **`locales.ts`**
  - `type Locale = 'en-US' | 'pt-BR'`;
  - `LOCALES` with each locale's native label ("English", "Português");
  - `detectLocale(navigator.languages)`.
- **`messages/en.ts`**
  - The source catalog: a nested object of strings and small functions for the
    strings that take values, e.g. `goalsDone: (done, total) => …`.
  - Exported `as const`. Its shape is the `Messages` type.
- **`messages/pt-BR.ts`**
  - `export const ptBR = { … } satisfies Messages`.
  - A missing or extra key, or a wrong function signature, fails the
    typecheck.
- **`i18nStore.ts`**, a zustand store shaped like `themeStore.ts`:
  - fields `locale` and `setLocale(locale, { persist })`;
  - it reads `localStorage['tw-locale']`, then `detectLocale`;
  - on every change it writes localStorage and sets
    `document.documentElement.lang`.
- **`useT()`** returns the active catalog, so `t.home.newEvent` is fully typed.
  There is also a non-hook `getT()` for store and domain code that runs
  outside React (notifications, store error toasts, the copy-report text).
- **Helpers:**
  - `plural(locale, n, { one, other })`;
  - `formatNumber`;
  - `ordinal`, since the report's "3rd" has no pt-BR equivalent; it becomes
    "3º".
- **Dates in `common/services/datetime/datetime.ts`.** `formatLong`,
  `formatDayLabel` and the duration helpers take the date-fns locale from the
  store:
  - pt-BR: "sábado, 17 de outubro de 2026, 14:51";
  - en-US: unchanged.

  Times stay 24h `HH:mm` in both locales.
- **Pre-paint:** extend the inline boot script in `index.html` to also set
  `document.documentElement.lang` from `tw-locale`. Its CSP hash in
  `firebase.json` must be updated; `src/test/csp.test.ts` fails until it is.

## B. Saving the choice

- **Signed out:** localStorage only (`tw-locale`).
- **Signed in:** `users/$uid/settings/locale`.
  - **Repository** (`meetingRepository.ts`):
    - `subscribeUserData` also returns `locale`;
    - a new `setLocale(uid, locale)` writes it, beside `setAutomaticBehavior`.
  - **Rules** (`scripts/database-rules.py`): under `settings`, add
    `"locale": {".validate": "newData.val() === 'en-US' || newData.val() === 'pt-BR'"}`.
    Then run `yarn rules`.
  - **Sync**, in `meetingStore.bind` or a small `useLocaleSync` in `AppShell`:
    - when the user node loads with a saved `locale`, apply it. The profile
      wins over the device, so the same account looks the same everywhere.
    - when the user node has no `locale` yet (first sign-in after this ships),
      save the current local choice to the profile. That way what someone
      picked on the landing carries over.
    - when the user picks a language while signed in, write the profile, which
      flows back through the subscription, and localStorage. The landing then
      shows the same language after sign-out.

## C. Language selector

- **Component:** `src/app/LanguageSelect.tsx`, built on the existing custom
  `Select` (`common/components/form/Select.tsx`).
  - It shows a compact trigger: a globe icon plus "EN" / "PT", with the native
    names in the list.
  - Its accessible label is "Language" / "Idioma".
  - It needs a `globe` path in `icons/Icon.tsx`.
- **Placement:**
  - **Landing header** (`features/landing/Landing.tsx`): inside the top-bar,
    left of `ThemeToggle`, with the same 36px height and border so the two
    controls read as a pair.
  - **Sidebar footer** (`app/AppSidebar.tsx`): above or beside `ThemeToggle`,
    with the same row style. When the sidebar is collapsed, it collapses to the
    globe icon.
- **What it calls:**
  - signed out: `i18nStore.setLocale`;
  - signed in: the store action that also writes the profile.

## D. Extracting and translating the strings

Work area by area, moving every literal into `en.ts` and writing its pt-BR
counterpart:

1. **App shell:** `app/*`, including sidebar labels, the loader, footer and
   save-error toast.
2. **Landing**, including the demo board, steps, feature rows, closing CTA and
   the emulator sign-in.
3. **Home:**
   - the greeting ("Good afternoon" → "Boa tarde");
   - the metrics;
   - the onboarding card;
   - the templates (`home/templates.ts`);
   - the menus;
   - Shared with me;
   - the access-requests notice.
4. **History:** filters, sort options, empty states and menu labels.
5. **Event form and dashboard:**
   - schedule;
   - milestones (`GoalsDecisionCollector`, `GoalFocusCard`, `GoalEditModal`);
   - the parking lot;
   - status badges;
   - confirm dialogs (start, finish, cancel);
   - keyboard-shortcut help.
6. **Report:**
   - the time cards and the feedback messages (`timeDisplayFeedbackRules.ts`:
     "On target! Left just", "Advanced by", "Saved", …);
   - the streak line with its ordinal;
   - the "Copy report" text (`TemplatePreviewModal.tsx`);
   - print labels.
7. **Sharing:**
   - the Share modal (roles, visibility, hints, request rows, "x min ago");
   - the no-access / request-access page;
   - the share chip.
8. **Domain texts:**
   - `metrics.ts` status and outcome labels ("100% under budget");
   - `timeAlerts.ts` notification bodies;
   - `burndown.ts` labels;
   - `access.ts` `ROLE_LABELS`;
   - BlankSlate defaults;
   - common components with default text (Modal close label, Select, Menu,
     dialog buttons "OK" / "Cancel" / "Confirm").

Translation notes for pt-BR:
- **Tone:** informal "você", short and direct, the same voice as the English.
- **Product terms:**
  - event = "evento";
  - milestone = "marco";
  - parking lot = "estacionamento de assuntos" (the label can stay "Parking
    lot" if the owner prefers the English term);
  - report = "relatório";
  - board = "quadro";
  - viewer / contributor = "leitor" / "colaborador";
  - time box = "caixa de tempo".
- **Glossary:** the owner reviews it once before the bulk translation, so
  terms stay consistent.

## E. Tests

- **Catalogs:** typecheck enforces parity. A unit test also walks both catalogs
  and fails on empty strings or strings left identical to English, with a small
  allow-list for terms like "Tymebox" and "OK".
- **i18n store:**
  - browser detection;
  - the localStorage round-trip;
  - `<html lang>` updates;
  - pt-BR date formatting and plurals.
- **Sync logic:** the profile wins, a local choice is saved on first sign-in,
  and a change while signed in writes the profile (store test with the
  repository mocked, as in `meetingStore.test.ts`).
- **Rules:** `settings/locale` accepts the two locales and rejects anything else
  (`database.rules.test.ts`).
- **Existing tests:** they keep asserting English. Test setup pins `en-US` so
  they don't depend on the machine's language. One smoke test per area renders
  in pt-BR and checks a few key strings.
- **CSP:** `csp.test.ts` keeps the boot script's hash honest.

## F. Rollout

- **Commits:** ship in a few commits on `main`:
  1. core + selector + persistence + rules;
  2. strings per area (shell, landing, home, history, dashboard, report,
     sharing, domain).
  3. a final pass for the glossary and formatting.
- **Language before the work is complete:** English stays the default for
  anyone without a saved choice. The selector is hidden until the last
  strings commit, so nobody sees a half-translated app.
- **Rules:** deploy before the client that writes `settings/locale`. CI already
  deploys rules before hosting.

## Verification

1. `yarn lint`, `typecheck`, `test`, `test:rules`, `build` are green.
2. Local check against the emulators (`yarn dev:local`):
   - **Signed out:** switch to Português on the landing and reload. It stays in
     Portuguese (localStorage) and `<html lang="pt-BR">` is set.
   - **First sign-in:** sign in with the emulator test user. The app stays in
     Portuguese and `users/<uid>/settings/locale` is `pt-BR` in the DB.
   - **Change while signed in:** switch to English in the sidebar. The DB
     updates. Sign out, and the landing is in English.
   - **Another device:** a second browser profile signs in as the same user and
     opens in the saved language.
   - **Walk-through in both languages:** Home, a full event (start, milestones,
     parking lot, finish), the report (dates in Portuguese, "Copy report"
     text), sharing and request access, History filters, dialogs, and a time
     alert notification.
   - **Layout:** check light and dark, and phone width, since Portuguese
     strings run about 20–30% longer.
3. After deploy: the same check on tymebox.web.app with a real Google account
   (needs the owner).
