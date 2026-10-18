import { act, renderHook } from '@testing-library/react';
import { useIsPhone, useMediaQuery } from './useMediaQuery';

function stubMatchMedia(width: number) {
  const listeners = new Set<() => void>();
  const matches = (query: string) => {
    const max = /max-width:\s*(\d+)px/.exec(query);
    const min = /min-width:\s*(\d+)px/.exec(query);
    return (!max || width <= Number(max[1])) && (!min || width >= Number(min[1]));
  };
  window.matchMedia = ((query: string) => ({
    get matches() {
      return matches(query);
    },
    media: query,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  })) as unknown as typeof window.matchMedia;
  return {
    resize(next: number) {
      width = next;
      listeners.forEach((fn) => fn());
    },
  };
}

describe('useMediaQuery', () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it('follows the window across the phone breakpoint', () => {
    const screen = stubMatchMedia(375);
    const { result } = renderHook(() => useIsPhone());
    expect(result.current).toBe(true);
    act(() => screen.resize(1024));
    expect(result.current).toBe(false);
  });

  it('is false where matchMedia is missing', () => {
    // @ts-expect-error simulating an environment without matchMedia
    window.matchMedia = undefined;
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'));
    expect(result.current).toBe(false);
  });
});
