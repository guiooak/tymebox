import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCountdownSeconds } from './useCountdownSeconds';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCountdownSeconds', () => {
  it('starts off, then remembers the choice', () => {
    const { result } = renderHook(() => useCountdownSeconds());
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem('tw-countdown-seconds')).toBe('1');
    act(() => result.current[1](false));
    expect(localStorage.getItem('tw-countdown-seconds')).toBe('0');
  });

  it('starts on when remembered', () => {
    localStorage.setItem('tw-countdown-seconds', '1');
    expect(renderHook(() => useCountdownSeconds()).result.current[0]).toBe(true);
  });

  it('works for the session when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useCountdownSeconds());
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
  });
});
