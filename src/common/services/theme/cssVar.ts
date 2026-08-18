import { useCallback, useEffect, useState } from 'react';

/** Resolve a CSS custom property to its concrete value on the document root. */
export function readCssVar(name: string, fallback = ''): string {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

/**
 * Read design tokens as concrete colour strings, re-reading whenever the theme
 * changes.
 *
 * SVG presentation attributes don't resolve `var()`, and the report's
 * chart-to-PNG export serializes the SVG on its own — so anything handed to
 * Recharts has to be a real colour, not a token reference.
 */
export function useCssVars<K extends string>(
  names: Record<K, string>,
): Record<K, string> {
  const read = useCallback(
    () =>
      Object.fromEntries(
        Object.entries(names).map(([key, prop]) => [key, readCssVar(prop as string)]),
      ) as Record<K, string>,
    // The token map is a literal at every call site; keying on the resolved
    // property names keeps this stable without asking callers to memoize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(names)],
  );

  const [values, setValues] = useState(read);

  useEffect(() => {
    const sync = () => setValues(read());
    sync();

    // An explicit choice stamps data-theme on <html>; "system" leaves it off
    // and follows the media query instead. Watch both.
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', sync);

    return () => {
      observer.disconnect();
      media.removeEventListener('change', sync);
    };
  }, [read]);

  return values;
}
