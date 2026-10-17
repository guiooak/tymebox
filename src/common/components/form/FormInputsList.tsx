import { useRef, type KeyboardEvent } from 'react';
import { useT } from '../../services/i18n';
import { uid } from '../../services/uid';
import { Button, CloseButton } from '../buttons';
import { cx } from '../cx';
import styles from './form.module.css';

export type InputsListItem = {
  id: string;
  name: string;
  weight: string;
};

export type FormInputsListProps = {
  label: string;
  value: InputsListItem[];
  onChange: (items: InputsListItem[]) => void;
  placeholder?: string;
  showWeight?: boolean;
  required?: boolean;
  showErrors?: boolean;
};

export function newInputsListItem(): InputsListItem {
  return { id: uid(), name: '', weight: '' };
}

export function FormInputsList({
  label,
  value,
  onChange,
  placeholder,
  showWeight = true,
  required,
  showErrors,
}: FormInputsListProps) {
  const t = useT();
  const itemName = placeholder ?? t.common.goal;
  const rows = value.length > 0 ? value : [newInputsListItem()];

  // Id of a freshly added row to move focus into once it mounts.
  const focusId = useRef<string | null>(null);

  const update = (id: string, patch: Partial<InputsListItem>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const add = () => onChange([...rows, newInputsListItem()]);

  const addAfter = (index: number) => {
    const item = newInputsListItem();
    focusId.current = item.id;
    onChange([...rows.slice(0, index + 1), item, ...rows.slice(index + 1)]);
  };

  // Enter on a filled goal inserts the next one and focuses it (without
  // submitting the surrounding form).
  const onNameKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (rows[index]?.name.trim()) {
        addAfter(index);
      }
    }
  };

  const remove = (id: string) => {
    const next = rows.filter((row) => row.id !== id);
    onChange(next.length > 0 ? next : [newInputsListItem()]);
  };

  const hasAnyName = rows.some((row) => row.name.trim());
  const error =
    required && showErrors && !hasAnyName ? t.common.namedRequired(label) : null;

  return (
    <div>
      <label className={styles.label}>{label}</label>
      <div className={styles.inputsList}>
        {rows.map((row, index) => (
          <div className={styles.listRow} key={row.id}>
            <input
              ref={(element) => {
                if (element && focusId.current === row.id) {
                  element.focus();
                  focusId.current = null;
                }
              }}
              className={cx(styles.control, styles.grow)}
              placeholder={`${itemName} ${index + 1}`}
              value={row.name}
              onChange={(event) => update(row.id, { name: event.target.value })}
              onKeyDown={(event) => onNameKeyDown(event, index)}
            />
            {showWeight && (
              <input
                className={cx(styles.control, styles.weight)}
                type="number"
                min={1}
                placeholder={t.common.weight}
                value={row.weight}
                onChange={(event) => update(row.id, { weight: event.target.value })}
              />
            )}
            <CloseButton onClick={() => remove(row.id)} label={t.common.removeGoal} />
          </div>
        ))}
        <Button
          className={styles.addRow}
          size="sm"
          theme="secondary"
          outline
          onClick={add}
        >
          {t.common.addNamed(itemName)}
        </Button>
        {error && <span className={styles.error}>{error}</span>}
      </div>
    </div>
  );
}
