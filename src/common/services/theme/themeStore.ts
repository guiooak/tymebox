import { createStore } from '../state';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'tw-theme';

// jsdom (and any non-browser host) has no matchMedia; the store still has to
// construct, so treat a missing implementation as "no preference".
const media = () =>
  typeof window === 'undefined' || typeof window.matchMedia !== 'function'
    ? null
    : window.matchMedia('(prefers-color-scheme: dark)');

export function systemTheme(): ResolvedTheme {
  return media()?.matches ? 'dark' : 'light';
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? systemTheme() : mode;
}

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : 'system';
}

/**
 * Stamp the resolved theme onto <html>.
 *
 * "system" is resolved here rather than in CSS so the stylesheet needs a
 * single `[data-theme='dark']` block instead of repeating every override
 * under a prefers-color-scheme query. The same write happens in an inline
 * boot script in index.html, before first paint, to avoid a flash.
 */
function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.dataset.theme = theme;
}

type ThemeState = {
  mode: ThemeMode;
  theme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** Follow OS changes while the mode is "system". Returns an unsubscribe. */
  listenToSystem: () => () => void;
};

export const useThemeStore = createStore<ThemeState>()((set, get) => ({
  mode: readStoredMode(),
  theme: resolveTheme(readStoredMode()),

  setMode: (mode) => {
    const theme = resolveTheme(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    applyTheme(theme);
    set({ mode, theme });
  },

  listenToSystem: () => {
    const query = media();
    if (!query) {
      return () => {};
    }
    const onChange = () => {
      if (get().mode !== 'system') {
        return;
      }
      const theme = systemTheme();
      applyTheme(theme);
      set({ theme });
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  },
}));
