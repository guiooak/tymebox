import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cx } from '../cx';
import { Icon } from '../icons';
import styles from './Menu.module.css';

export type MenuItem = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export type MenuProps = {
  items: MenuItem[];
  /** Accessible name for the trigger, e.g. "Milestone actions". */
  label: string;
  className?: string;
};

/** Vertical-ellipsis overflow menu. Closes on outside click, Escape, or select. */
export function Menu({ items, label, className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Open upwards when the list would run past the bottom of the screen (or
  // under the phone tab bar). Measured before paint, set on the element.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!open || !list) {
      return;
    }
    const tabBar = document.querySelector('[data-tab-bar]');
    const bottomLimit =
      window.innerHeight - (tabBar instanceof HTMLElement ? tabBar.offsetHeight : 0) - 8;
    list.classList.toggle(styles.up, list.getBoundingClientRect().bottom > bottomLimit);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keyup', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keyup', onKey);
    };
  }, [open]);

  return (
    <div className={cx(styles.menu, className)} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="moreVertical" size={18} />
      </button>
      {open && (
        <div className={styles.list} role="menu" ref={listRef}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={cx(styles.item, item.danger && styles.danger)}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
