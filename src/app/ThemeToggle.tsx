import { useEffect } from 'react';
import { Icon, type IconName } from '../common/components';
import { useThemeStore, type ThemeMode } from '../common/services/theme';

const ORDER: ThemeMode[] = ['system', 'light', 'dark'];

const LABEL: Record<ThemeMode, { icon: IconName; text: string }> = {
  system: { icon: 'system', text: 'System theme' },
  light: { icon: 'sun', text: 'Light theme' },
  dark: { icon: 'moon', text: 'Dark theme' },
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
      <Icon name={current.icon} className={iconClassName} />
      <span className={labelClassName}>{current.text}</span>
    </button>
  );
}
