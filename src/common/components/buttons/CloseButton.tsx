import { useT } from '../../services/i18n';
import { cx } from '../cx';
import styles from './CloseButton.module.css';

export type CloseButtonProps = {
  onClick?: () => void;
  label?: string;
  className?: string;
};

export function CloseButton({ onClick, label, className }: CloseButtonProps) {
  const t = useT();
  return (
    <button
      type="button"
      aria-label={label ?? t.common.close}
      className={cx(styles.close, className)}
      onClick={onClick}
    >
      &times;
    </button>
  );
}
