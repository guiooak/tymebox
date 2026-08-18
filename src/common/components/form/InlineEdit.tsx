import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cx } from '../cx';
import { useAutoGrowTextarea } from '../useAutoGrowTextarea';
import styles from './InlineEdit.module.css';

export type InlineEditProps = {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name for both the trigger and the field it turns into. */
  label: string;
  placeholder?: string;
  multiline?: boolean;
  readOnly?: boolean;
  /** Visual weight of the read-only text: matches the surrounding typography. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

/**
 * Click-to-edit text. Reads as plain copy until clicked, then becomes an input
 * (or textarea) in place. Enter commits a single-line value, Escape cancels,
 * blur commits — the same feel as goal notes and parking-lot post-its.
 */
export function InlineEdit({
  value,
  onChange,
  label,
  placeholder = 'Click to add',
  multiline,
  readOnly,
  size = 'md',
  className,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useAutoGrowTextarea(textareaRef, editing ? draft : '');

  // A live edit shouldn't be stomped by an incoming store update.
  useEffect(() => {
    if (!editing) {
      setDraft(value);
    }
  }, [value, editing]);

  useEffect(() => {
    if (!editing) {
      return;
    }
    const element = multiline ? textareaRef.current : inputRef.current;
    element?.focus();
    element?.setSelectionRange(element.value.length, element.value.length);
  }, [editing, multiline]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== value) {
      onChange(next);
    }
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    } else if (event.key === 'Enter' && (!multiline || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commit();
    }
  };

  if (readOnly) {
    return (
      <span className={cx(styles.text, styles[size], !value && styles.empty, className)}>
        {value || placeholder}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={`Edit ${label}`}
        className={cx(
          styles.trigger,
          styles.text,
          styles[size],
          !value && styles.empty,
          className,
        )}
        onClick={() => setEditing(true)}
      >
        {value || placeholder}
      </button>
    );
  }

  return multiline ? (
    <textarea
      ref={textareaRef}
      aria-label={label}
      className={cx(styles.field, styles[size], className)}
      value={draft}
      placeholder={placeholder}
      rows={1}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  ) : (
    <input
      ref={inputRef}
      aria-label={label}
      className={cx(styles.field, styles[size], className)}
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  );
}
