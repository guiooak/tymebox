# Tymebox — Landing at /pt and /en (localized URLs for public pages only)

## Context

The app now speaks pt-BR and en-US. The language comes from the profile when
signed in, and from localStorage or the browser when signed out. The landing,
however, lives at a single URL (`/`) whose served HTML is always English
(`index.html`: title, description, Open Graph). Two consequences:

- **Search:** Google sees one page in one language.
- **Link previews:** WhatsApp, Slack and LinkedIn don't run JavaScript, so a
  shared link always previews in English.

Decision taken with the owner: put the language in the URL **only for the
public landing**, as `/pt` and `/en`. Each gets its own pre-built HTML with
translated meta tags and `hreflang`. Everything behind sign-in keeps
language-neutral URLs (`/events/...`), with the language still coming from the
profile, so shared event links stay identical for everyone.

## Behaviour

| URL | Signed out | Signed in |
|---|---|---|
| `/` | Redirects (replace) to `/pt` or `/en`, using the saved choice, else the browser language (`detectLocale`). It's also the `x-default` for `hreflang`. | Home, as today |
| `/pt`, `/en` | Landing in that language. Visiting it **sets** the locale (the URL wins on the public page) and saves it to localStorage. | Redirects to `/` (Home). The profile language still applies. |
| `/login` | Landing in the current language, as today. It's the guard's target, so the return path keeps working after sign-in. | Back to the requested page, as today |
| `/events/...` | Guard → `/login` | Unchanged |

- **Selector on the landing:** it navigates to the other URL (`/pt` ↔ `/en`,
  replace) as well as switching the locale. On `/login` it only switches,
  since that page must keep its return state.
- **Signing in from `/pt`:** the existing rule applies. The profile's language
  wins if there is one; otherwise the local choice (pt-BR) is saved to the
  profile.

## A. Routes (`src/common/services/router/paths.ts`, `src/app/AppShell.tsx`)

- `paths.landing = (locale) => locale === 'pt-BR' ? '/pt' : '/en'`
  (or route constants `landingPt: '/pt'` and `landingEn: '/en'`), plus
  `LANDING_LOCALES: Record<'/pt' | '/en', Locale>`.
- **AppShell routes:**
  - `paths.home`: `authed ? <Home /> : <Navigate to={landingFor(currentLocale)} replace />`;
  - `/pt` and `/en`: `authed ? <Navigate to="/" replace /> : <LocalizedLanding locale=… />`.
- **`LocalizedLanding`** (`features/landing/`) sets the locale once, as a
  render-time sync, not `setState` in an effect: it compares and calls
  `useI18nStore.getState().setLocale` during render when they differ. That
  follows the derived-state pattern the repo already uses for the React
  Compiler lint rules. Then it renders `<Landing />`.
- **`LanguageSelect`** (`src/app/LanguageSelect.tsx`) gets an optional
  `onChange` override, so the landing can navigate to the other URL. The
  sidebar keeps using `chooseLocale`.

## B. One HTML per language at build time (`vite.config.ts`)

- A small local Vite plugin, `localizedHtml()`, in `scripts/localized-html.ts`.
  In `generateBundle` it takes the emitted `index.html` and emits
  `pt/index.html` and `en/index.html` with:
  - `<html lang>` set to `pt-BR` or `en-US`;
  - `<title>`, meta description, `og:title`, `og:description`, `og:locale`
    (`pt_BR` / `en_US`), `og:url` and `og:locale:alternate`;
  - `<link rel="canonical">` to its own URL;
  - `hreflang` alternates on all three files:
    - `pt-BR` → `/pt`;
    - `en-US` → `/en`;
    - `x-default` → `/`.
- **Root file:** the root `index.html` gets the same `hreflang` links, so the
  three point at each other.
- **Text source:** the strings come from the i18n catalogs, in a new `meta`
  section with `title`, `description`, `ogTitle` and `ogDescription` in
  `en.ts` / `ptBR.ts`. `vite.config.ts` imports them, so there's one source
  of truth. The runtime `document.title` (`shell.documentTitle`) can read the
  same keys.
- **Site URL:** `SITE_URL = 'https://tymebox.web.app'` (overridable with
  `VITE_SITE_URL`) builds the absolute URLs.
- **Logic:** keep it a pure function, `localizeHtml(html, locale, siteUrl)`,
  so it can be unit-tested. The plugin only wires it into the build.
- **CSP:** the inline theme boot script is copied byte for byte, so the CSP
  hash in `firebase.json` stays valid. `src/test/csp.test.ts` already guards
  it.

## C. Hosting (`firebase.json`) and crawlers (`public/`)

- **`trailingSlash: false`:** add it to `hosting` so `/pt` serves
  `dist/pt/index.html` directly, without a redirect to `/pt/`. Static files
  win over the `**` → `/index.html` rewrite.
- **Cache:** the no-cache header regex `^/(?:[^.]*|index\.html)$` already covers
  `/pt` and `/en`. Extend it to `(?:pt/|en/)?index\.html` too.
- **`public/robots.txt`:** allow all and point to the sitemap.
- **`public/sitemap.xml`:** list `/pt` and `/en`, each with `xhtml:link`
  alternates.

## D. Tests

- **`localizeHtml`:** for each locale it checks the `lang`, title,
  description, OG tags, canonical and the three `hreflang` links, and that
  the inline boot script is unchanged.
- **Routing** (an AppShell-style test with `MemoryRouter` and mocked auth, as
  in `Landing.test.tsx`):
  - signed out at `/`, it redirects to `/en` (or to `/pt` with a pt choice
    saved);
  - `/pt` renders the landing in Portuguese and sets the stored locale;
  - signed in, `/pt` redirects to `/`.
- **Selector:** on the landing, choosing English navigates to `/en`.
- **Existing tests:** they still pass. `csp.test.ts` keeps validating the hash.

## Verification

1. Run `yarn lint`, `typecheck`, `test`, `test:rules` and `build`. Then inspect
   `dist/pt/index.html` and `dist/en/index.html`: titles, OG, canonical,
   hreflang.
2. **Locally, with the production build behind the hosting emulator**
   (`firebase emulators:start --only hosting`, which applies `firebase.json`):
   - `curl -s localhost:5000/pt | grep '<title>'` shows the Portuguese title,
     with no redirect to `/pt/`.
   - In the browser (in-app pane):
     - `/` lands on `/pt` or `/en`;
     - the selector switches URL and language;
     - `/pt` → sign in (emulator test sign-in, dev build) → Home.
3. **After deploy, on tymebox.web.app:**
   - `curl` `/pt` and `/en` and check the meta tags;
   - preview `https://tymebox.web.app/pt` in a link checker (e.g. an Open
     Graph debugger) or by pasting it in WhatsApp; it should show Portuguese.
   - Optional, for the owner: submit the sitemap in Google Search Console.

## Out of scope

- Localized OG **image**: it stays the app icon.
- Localized URLs inside the app (`/pt/events/...`), deliberately.
- A `noindex` for `/login`: it serves the root HTML. Its canonical points to
  `/` → x-default, which is enough.

## Outcome

Shipped on 2026-10-17 as `d6d4dd5`:

- `/pt` and `/en` serve the landing in their language, with their own HTML
  for search engines and link previews;
- the URL decides the language there, and the choice is remembered on the
  device;
- `/` sends a signed-out visitor to the landing in their language, and a
  signed-in one to Home.

On 2026-10-18 (`4812eb6`) each language also got its own 1200×630 share card
(`public/og-pt.png`, `public/og-en.png`, drawn by `scripts/share-card.mjs`),
so a link pasted in WhatsApp shows a proper preview.
