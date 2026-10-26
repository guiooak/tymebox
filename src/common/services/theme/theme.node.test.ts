// @vitest-environment node
import { describe, expect, it } from 'vitest';

/*
 * Outside a browser there is no window, document or OS preference: the theme
 * store starts on "system" resolved to light, and token reads use their
 * fallback.
 */

describe('theme services without a browser', () => {
  it('start on "system", light, and switch without a page', async () => {
    const { useThemeStore } = await import('./themeStore');
    expect(useThemeStore.getState()).toMatchObject({ mode: 'system', theme: 'light' });
    expect(useThemeStore.getState().listenToSystem()).toBeTypeOf('function');
  });

  it('read tokens as their fallback', async () => {
    const { readCssVar } = await import('./cssVar');
    expect(readCssVar('--tw-primary', '#2563eb')).toBe('#2563eb');
  });
});
