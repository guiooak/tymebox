import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readCssVar, readCssVarsInTheme, useCssVars } from './cssVar';
import { setViewport } from '../../../test/render';

/*
 * jsdom doesn't compute colours, so these tests check the plumbing: declared
 * tokens are read through a probe element, undeclared ones use the fallback,
 * and the hook re-reads when the theme changes.
 */

const root = document.documentElement;

afterEach(() => {
  root.style.removeProperty('--tw-test');
  delete root.dataset.theme;
});

describe('readCssVar', () => {
  it('resolves a declared token through a temporary element', () => {
    root.style.setProperty('--tw-test', 'rgb(1, 2, 3)');
    const result = readCssVar('--tw-test', 'fallback');
    expect(result).not.toBe('fallback');
    expect(document.body.querySelector('span')).toBeNull();
  });

  it('uses the fallback for a token that isn’t declared', () => {
    expect(readCssVar('--tw-missing', '#000')).toBe('#000');
    expect(readCssVar('--tw-missing')).toBe('');
  });
});

describe('readCssVarsInTheme', () => {
  it('reads in the given theme and puts the page back as it was', () => {
    expect(readCssVarsInTheme({ a: '--tw-missing' }, 'light')).toEqual({ a: '' });
    expect(root.dataset.theme).toBeUndefined();

    root.dataset.theme = 'dark';
    readCssVarsInTheme({ a: '--tw-missing' }, 'light');
    expect(root.dataset.theme).toBe('dark');
  });
});

describe('useCssVars', () => {
  it('reads the tokens and re-reads when the theme attribute or OS preference changes', async () => {
    const listeners: Array<() => void> = [];
    setViewport('desktop');
    const matchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      ...matchMedia(query),
      addEventListener: (_type: string, listener: () => void) => {
        listeners.push(listener);
      },
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    const { result, unmount } = renderHook(() => useCssVars({ main: '--tw-test' }));
    expect(result.current).toEqual({ main: '' });

    root.style.setProperty('--tw-test', 'red');
    await act(async () => {
      root.dataset.theme = 'dark';
      await Promise.resolve();
    });
    expect(result.current.main).not.toBe('');

    root.style.removeProperty('--tw-test');
    act(() => listeners.forEach((listener) => listener()));
    expect(result.current).toEqual({ main: '' });
    unmount();
  });
});
