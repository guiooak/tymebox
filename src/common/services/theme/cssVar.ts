import { useCallback, useEffect, useState } from 'react';

/**
 * Resolve a colour token to a concrete `rgb()` string.
 *
 * Reading the custom property directly would hand back its *declared* value —
 * `color-mix(in srgb, …)` for the tinted tokens, since custom properties are
 * substituted but not evaluated. That string is fine in a stylesheet and a
 * liability everywhere else, so the value is resolved by letting the engine
 * compute it as a real colour on a throwaway element.
 */
export function readCssVar(name: string, fallback = ''): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback;
  }
  const probe = document.createElement('span');
  probe.style.display = 'none';
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();

  // An unset token leaves `color` at its inherited value rather than empty, so
  // fall back when the property isn't declared at all.
  const declared = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return declared ? resolved : fallback;
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
