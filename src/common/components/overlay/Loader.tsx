import { useT } from '../../services/i18n';
import { cx } from '../cx';
import styles from './Loader.module.css';

export type LoaderProps = { label?: string; className?: string };

export function Loader({ label, className }: LoaderProps) {
  const t = useT();
  return (
    <div className={cx(styles.loader, className)} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <span className={styles.label}>{label ?? t.common.loading}</span>
    </div>
  );
}
