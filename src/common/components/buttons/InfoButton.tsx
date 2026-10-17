import type { ReactNode } from 'react';
import { useT } from '../../services/i18n';
import styles from './InfoButton.module.css';

export type InfoButtonProps = {
  children?: ReactNode;
  onClick?: () => void;
  label?: string;
};

export function InfoButton({ children, onClick, label }: InfoButtonProps) {
  const t = useT();
  return (
    <button
      type="button"
      aria-label={label ?? t.common.moreInfo}
      className={styles.info}
      onClick={onClick}
    >
      {children ?? 'i'}
    </button>
  );
}
