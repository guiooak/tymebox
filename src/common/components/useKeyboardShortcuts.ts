import { useEffect, useRef } from 'react';

export type Shortcut = {
  /** Single character, matched case-insensitively (e.g. 'd', '?'). */
  key: string;
  description: string;
  onTrigger: () => void;
  disabled?: boolean;
};

/** Typing in a field should never fire a shortcut. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
  );
}

/**
 * Bare single-key shortcuts for power users. Modifier combinations are left to
 * the browser, and keystrokes inside form fields are ignored.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled = true): void {
  const latest = useRef(shortcuts);
  latest.current = shortcuts;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTypingTarget(event.target)
      ) {
        return;
      }
      const match = latest.current.find(
        (shortcut) =>
          !shortcut.disabled && shortcut.key.toLowerCase() === event.key.toLowerCase(),
      );
      if (match) {
        event.preventDefault();
        match.onTrigger();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
