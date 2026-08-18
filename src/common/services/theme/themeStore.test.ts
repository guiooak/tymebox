import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveTheme, THEME_STORAGE_KEY, useThemeStore } from './themeStore';

function mockSystemDark(matches: boolean) {
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    })),
  );
  return { fire: () => listeners.forEach((fn) => fn()) };
}

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    useThemeStore.setState({ mode: 'system', theme: 'light' });
  });

  it('resolves "system" from the OS preference', () => {
    mockSystemDark(true);
    expect(resolveTheme('system')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
  });

  it('stamps the resolved theme onto the document root', () => {
    mockSystemDark(false);
    useThemeStore.getState().setMode('dark');

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('persists the mode, not the resolved theme', () => {
    mockSystemDark(true);
    useThemeStore.getState().setMode('system');

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('follows OS changes only while the mode is "system"', () => {
    const system = mockSystemDark(false);
    useThemeStore.getState().setMode('system');
    const stop = useThemeStore.getState().listenToSystem();

    mockSystemDark(true);
    system.fire();
    expect(useThemeStore.getState().theme).toBe('dark');

    useThemeStore.getState().setMode('light');
    system.fire();
    expect(useThemeStore.getState().theme).toBe('light');

    stop();
  });
});
