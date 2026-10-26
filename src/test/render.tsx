import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { DialogProvider } from '../common/components';
import { useI18nStore, type Locale } from '../common/services/i18n';
import { useAuthStore, type AuthState } from '../features/auth';
import { useMeetingStore, type MeetingState } from '../features/meeting/store';

/*
 * One way to render a screen in tests, with what the app wraps it in: dialogs,
 * the router and the language. Stores are reset after every test (below).
 */

// Every test file that renders through here starts each test from the same
// stores and language.
afterEach(() => {
  useMeetingStore.setState(useMeetingStore.getInitialState(), true);
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  if (useI18nStore.getState().locale !== 'en-US') {
    useI18nStore.getState().setLocale('en-US');
  }
});

export type Viewport = 'phone' | 'tablet' | 'desktop';

const QUERIES: Record<Viewport, string[]> = {
  phone: ['(max-width: 640px)'],
  tablet: ['(min-width: 641px) and (max-width: 1024px)'],
  desktop: [],
};

/**
 * Pretend the window is a phone, a tablet or a desktop for every media query
 * the app asks. `prefers-*` queries are false unless listed in `extra`.
 */
export function setViewport(viewport: Viewport, extra: string[] = []) {
  const matching = new Set([...QUERIES[viewport], ...extra]);
  window.matchMedia = ((query: string) => ({
    matches: matching.has(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/** Shows the router's current path, for tests that check navigation. */
export function CurrentPath() {
  const location = useLocation();
  return <output data-testid="path">{location.pathname + location.search}</output>;
}

export type RenderOptions = {
  /** The URL to start at. Default "/". */
  route?: string;
  /** Mount `ui` under this route pattern (e.g. "/events/:id"), so params work. */
  path?: string;
  locale?: Locale;
  store?: Partial<MeetingState>;
  auth?: Partial<AuthState>;
  viewport?: Viewport;
  /** Other media queries that match, e.g. '(prefers-reduced-motion: reduce)'. */
  media?: string[];
};

export function renderWithApp(
  ui: ReactElement,
  {
    route = '/',
    path,
    locale = 'en-US',
    store,
    auth,
    viewport = 'desktop',
    media = [],
  }: RenderOptions = {},
): RenderResult & { user: () => UserEvent; path: () => string | null } {
  // jsdom has no matchMedia; screens that read it get a desktop by default.
  setViewport(viewport, media);
  useI18nStore.getState().setLocale(locale);
  if (auth) {
    useAuthStore.setState(auth);
  }
  if (store) {
    useMeetingStore.setState(store);
  }
  let user: UserEvent | undefined;
  const result = render(
    <DialogProvider>
      <MemoryRouter initialEntries={[route]}>
        {path ? (
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={null} />
          </Routes>
        ) : (
          ui
        )}
        <CurrentPath />
      </MemoryRouter>
    </DialogProvider>,
  );
  return {
    ...result,
    // Created on first call: userEvent.setup() swaps navigator.clipboard for
    // its own stub, which would hide the clipboard spies of tests that don't
    // type through it.
    user: () => (user ??= userEvent.setup()),
    path: () => result.getByTestId('path').textContent,
  };
}
