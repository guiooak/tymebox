import { useCallback, useSyncExternalStore } from 'react';

/*
 * Layout breakpoints, mirrored in CSS media queries (custom properties can't
 * be used there): phone ≤ 640px, tablet 641–1024px, desktop above.
 * See also --tw-bp-phone / --tw-bp-tablet in tokens/spacing.css.
 */
export const PHONE_QUERY = '(max-width: 640px)';
export const TABLET_QUERY = '(min-width: 641px) and (max-width: 1024px)';

const supported = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/** Whether a media query matches, kept in sync as the window changes. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!supported()) {
        return () => {};
      }
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => supported() && window.matchMedia(query).matches,
  );
}

/** Phone-sized window: the app swaps the sidebar for a bottom tab bar. */
export function useIsPhone(): boolean {
  return useMediaQuery(PHONE_QUERY);
}
