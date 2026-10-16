import { useState } from 'react';

const STORAGE_KEY = 'tw-countdown-seconds';

/**
 * Whether the dashboard countdown shows ticking seconds. Off by default —
 * whole minutes are calmer to glance at during a meeting — and remembered
 * per browser.
 */
export function useCountdownSeconds(): [boolean, (value: boolean) => void] {
  const [showSeconds, setShowSeconds] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const update = (value: boolean) => {
    setShowSeconds(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      // Storage can be unavailable (private mode); the choice then lasts the session.
    }
  };

  return [showSeconds, update];
}
