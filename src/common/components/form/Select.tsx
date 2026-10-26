import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../cx';
import { Icon } from '../icons';
import styles from './Select.module.css';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  /** Optional second line, shown in the list only. */
  description?: string;
};

export type SelectProps<T extends string> = {
  value: T;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (value: T) => void;
  /** Accessible name; there's no visible label inside the control. */
  label: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  id?: string;
  /** What the closed control shows; defaults to the selected option's label. */
  renderValue?: (option: SelectOption<T>) => ReactNode;
};

const GAP = 4;
const MARGIN = 8;

/**
 * A select with our own list instead of the browser's, following the ARIA
 * "select-only combobox" pattern: focus stays on the button and the list is
 * announced through aria-activedescendant.
 *
 * Keyboard: ↓/↑/Enter/Space open; ↓/↑/Home/End move; Enter/Space pick;
 * Escape or Tab close; typing a letter jumps to the next option starting
 * with it. The list renders in a portal with fixed positioning, so a modal or
 * scrolling container can't clip it, and flips above when there's no room.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
  disabled,
  className,
  id,
  renderValue,
}: SelectProps<T>) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const escapedRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<CSSProperties>({});

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];

  const openList = (index = selectedIndex) => {
    if (disabled || options.length === 0) {
      return;
    }
    setActive(index);
    setOpen(true);
  };

  const close = () => setOpen(false);

  const choose = (index: number) => {
    close();
    if (options[index].value !== value) {
      onChange(options[index].value);
    }
  };

  // Place the list under the button (or above, when it would run off the
  // bottom), at least as wide as the button and kept inside the viewport.
  const place = useCallback(() => {
    // Only runs while the list is open, so both elements are mounted.
    const trigger = triggerRef.current as HTMLButtonElement;
    const list = listRef.current as HTMLUListElement;
    const rect = trigger.getBoundingClientRect();
    const height = list.offsetHeight;
    const width = Math.max(rect.width, list.offsetWidth);
    const below = window.innerHeight - rect.bottom - GAP - MARGIN;
    const top =
      below >= height || rect.top < height ? rect.bottom + GAP : rect.top - GAP - height;
    const left = Math.min(rect.left, window.innerWidth - width - MARGIN);
    setPosition({ top, left: Math.max(MARGIN, left), minWidth: rect.width });
  }, []);

  useLayoutEffect(() => {
    if (open) {
      place();
    }
  }, [open, place]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const trigger = triggerRef.current as HTMLButtonElement;
      const list = listRef.current as HTMLUListElement;
      if (!trigger.contains(target) && !list.contains(target)) {
        close();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  // Keep the highlighted option in view while moving through a long list.
  useEffect(() => {
    if (open) {
      const option = document.getElementById(`${baseId}-option-${active}`);
      (option as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [open, active, baseId]);

  const jumpToLetter = (key: string) => {
    const letter = key.toLowerCase();
    for (let step = 1; step <= options.length; step += 1) {
      const index = (active + step) % options.length;
      if (options[index].label.toLowerCase().startsWith(letter)) {
        return index;
      }
    }
    return -1;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive((index) => Math.min(last, index + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((index) => Math.max(0, index - 1));
        break;
      case 'Home':
        event.preventDefault();
        setActive(0);
        break;
      case 'End':
        event.preventDefault();
        setActive(last);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(active);
        break;
      case 'Escape':
        event.preventDefault();
        // Don't let the same key close a surrounding modal (it listens on keyup).
        escapedRef.current = true;
        close();
        break;
      case 'Tab':
        close();
        break;
      default:
        if (event.key.length === 1 && /\S/.test(event.key)) {
          const index = jumpToLetter(event.key);
          if (index >= 0) {
            setActive(index);
          }
        }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={baseId}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        disabled={disabled}
        className={cx(styles.trigger, styles[size], open && styles.open, className)}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        onKeyUp={(event) => {
          if (event.key === 'Escape' && escapedRef.current) {
            escapedRef.current = false;
            event.stopPropagation();
          }
        }}
      >
        <span className={styles.value}>
          {selected ? (renderValue ? renderValue(selected) : selected.label) : ''}
        </span>
        <Icon name="chevronDown" size={16} className={styles.chevron} />
      </button>
      {open &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            className={styles.list}
            style={position}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  className={cx(
                    styles.option,
                    index === active && styles.active,
                    isSelected && styles.selected,
                  )}
                  // Keep focus on the button so the keyboard keeps working.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                >
                  <span className={styles.optionText}>
                    <span>{option.label}</span>
                    {option.description && (
                      <span className={styles.description}>{option.description}</span>
                    )}
                  </span>
                  {isSelected && <Icon name="check" size={16} className={styles.check} />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
