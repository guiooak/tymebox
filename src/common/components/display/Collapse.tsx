import type { ReactNode } from 'react';
import { Checkbox } from '../form';
import { cx } from '../cx';
import styles from './Collapse.module.css';

export type CollapseProps = {
  title: ReactNode;
  /**
   * Interactive title replacement. Rendered outside the toggle button so it can
   * hold its own controls (an inline editor, links); the caret becomes a
   * standalone toggle. `title` is still used as the toggle's accessible name.
   */
  titleSlot?: ReactNode;
  /** Extra header controls placed before the checkbox (e.g. an overflow menu). */
  actions?: ReactNode;
  /** Content rendered at the very start of the header, e.g. a drag handle. */
  leading?: ReactNode;
  open: boolean;
  onToggleOpen: (open: boolean) => void;
  checkbox?: {
    label: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
  };
  children: ReactNode;
};

export function Collapse({
  title,
  titleSlot,
  actions,
  leading,
  open,
  onToggleOpen,
  checkbox,
  children,
}: CollapseProps) {
  const caret = (
    <span className={styles.caret} aria-hidden="true">
      ▸
    </span>
  );

  return (
    <div className={cx(styles.collapse, open && styles.open)}>
      <div className={styles.header}>
        {leading}
        {titleSlot ? (
          <>
            <button
              type="button"
              className={styles.caretButton}
              aria-expanded={open}
              aria-label={typeof title === 'string' ? `Toggle ${title}` : 'Toggle'}
              onClick={() => onToggleOpen(!open)}
            >
              {caret}
            </button>
            <div className={styles.titleSlot}>{titleSlot}</div>
          </>
        ) : (
          <button
            type="button"
            className={styles.titleButton}
            onClick={() => onToggleOpen(!open)}
          >
            {caret}
            <span className={styles.title}>{title}</span>
          </button>
        )}
        {actions}
        {checkbox && (
          <span onClick={(event) => event.stopPropagation()}>
            <Checkbox
              label={checkbox.label}
              checked={checkbox.checked}
              disabled={checkbox.disabled}
              onChange={checkbox.onChange}
            />
          </span>
        )}
      </div>
      <div className={styles.bodyWrap}>
        <div className={styles.bodyInner}>
          <div className={styles.body}>{children}</div>
        </div>
      </div>
    </div>
  );
}
