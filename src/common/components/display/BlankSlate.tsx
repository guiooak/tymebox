import type { ReactNode } from 'react';
import { cx } from '../cx';
import { BlankSlateArt, type BlankSlateArtName } from './BlankSlateArt';
import styles from './BlankSlate.module.css';

export type BlankSlateProps = {
  art: BlankSlateArtName;
  /** The one-line invitation. Kept short — the action carries the detail. */
  title: ReactNode;
  description?: ReactNode;
  /** Optional call to action, e.g. a Button. */
  action?: ReactNode;
  /** Tighter spacing for slates that sit inside a panel rather than a page. */
  compact?: boolean;
  className?: string;
};

/** Shared blank-slate treatment, so first-run moments read as designed. */
export function BlankSlate({
  art,
  title,
  description,
  action,
  compact,
  className,
}: BlankSlateProps) {
  return (
    <div className={cx(styles.blankSlate, compact && styles.compact, className)}>
      <BlankSlateArt name={art} />
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action}
    </div>
  );
}
