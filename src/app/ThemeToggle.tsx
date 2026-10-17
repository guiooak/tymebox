import { useEffect } from 'react';
import { Icon, type IconName } from '../common/components';
import { useT } from '../common/services/i18n';
import { useThemeStore, type ThemeMode } from '../common/services/theme';

const ORDER: ThemeMode[] = ['system', 'light', 'dark'];

const ICON: Record<ThemeMode, IconName> = {
  system: 'system',
  light: 'sun',
  dark: 'moon',
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
  const t = useT();

  useEffect(() => listenToSystem(), [listenToSystem]);

  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  const current = t.shell.theme[mode];
  const upcoming = t.shell.theme[next];

  return (
    <button
      className={className}
      onClick={() => setMode(next)}
      title={t.shell.theme.switchTitle(current, upcoming)}
      aria-label={t.shell.theme.switchTo(current, upcoming)}
    >
      <Icon name={ICON[mode]} className={iconClassName} />
      <span className={labelClassName}>{current}</span>
    </button>
  );
}
