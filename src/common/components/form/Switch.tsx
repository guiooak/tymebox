import styles from './form.module.css';

export type SwitchProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

export function Switch({ checked, disabled, onChange, label }: SwitchProps) {
  return (
    <label className={styles.switch}>
      {/* The name goes on the control itself: a <label>'s aria-label names nothing. */}
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.track}>
        <span className={styles.thumb} />
      </span>
    </label>
  );
}
