import type { ReactNode } from 'react';
import { cx } from '../cx';
import type { Theme } from '../layout';
import styles from './Badge.module.css';

export type BadgeProps = {
  children: ReactNode;
  theme?: Theme;
  className?: string;
};

/** Small status pill — event status, streak counters, goal tags. */
export function Badge({ children, theme = 'secondary', className }: BadgeProps) {
  return <span className={cx(styles.badge, styles[theme], className)}>{children}</span>;
}
