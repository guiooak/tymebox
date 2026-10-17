import { useRef } from 'react';
import { useT } from '../../services/i18n';
import { CloseButton } from '../buttons';
import { useAutoGrowTextarea } from '../useAutoGrowTextarea';
import styles from './PostIt.module.css';

export type PostItProps = {
  value: string;
  prefix?: string;
  onChange: (value: string) => void;
  /** Called with the field's current text, which can be ahead of `value`. */
  onBlur?: (value: string) => void;
  onDelete?: () => void;
  maxLength?: number;
  /** Focus the field when it mounts, e.g. for a card the user just added. */
  autoFocus?: boolean;
  readOnly?: boolean;
};

export function PostIt({
  value,
  prefix,
  onChange,
  onBlur,
  onDelete,
  maxLength,
  autoFocus,
  readOnly,
}: PostItProps) {
  const t = useT();
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutoGrowTextarea(ref, value);

  return (
    <div className={styles.postIt}>
      {!readOnly && (
        <CloseButton
          className={styles.close}
          onClick={onDelete}
          label={t.board.deleteTopic}
        />
      )}
      <div className={styles.row}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <textarea
          ref={ref}
          className={styles.textarea}
          value={value}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => onBlur?.(event.currentTarget.value)}
          autoFocus={autoFocus}
          readOnly={readOnly}
          rows={1}
        />
      </div>
    </div>
  );
}
