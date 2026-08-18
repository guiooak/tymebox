import { useEffect } from 'react';
import { useThemeStore, type ThemeMode } from '../common/services/theme';

const ORDER: ThemeMode[] = ['system', 'light', 'dark'];

const LABEL: Record<ThemeMode, { icon: string; text: string }> = {
  system: { icon: '◐', text: 'System theme' },
  light: { icon: '☀', text: 'Light theme' },
  dark: { icon: '☾', text: 'Dark theme' },
};

export type ThemeToggleProps = {
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
};

/** Cycles system → light → dark. Styling comes from the surrounding chrome. */
export function ThemeToggle({
  className,
  iconClassName,
  labelClassName,
}: ThemeToggleProps) {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const listenToSystem = useThemeStore((state) => state.listenToSystem);

  useEffect(() => listenToSystem(), [listenToSystem]);

  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  const current = LABEL[mode];

  return (
    <button
      className={className}
      onClick={() => setMode(next)}
      title={`${current.text} — switch to ${LABEL[next].text.toLowerCase()}`}
      aria-label={`${current.text}. Switch to ${LABEL[next].text.toLowerCase()}`}
    >
      <span className={iconClassName} aria-hidden="true">
        {current.icon}
      </span>
      <span className={labelClassName}>{current.text}</span>
    </button>
  );
}
