import type { CSSProperties } from 'react';
import { TymeboxSymbol } from './TymeboxSymbol';
import styles from './Logo.module.css';

export type LogoProps = {
  /** Height of the symbol in px; the wordmark scales from it (manual §03). */
  size?: number;
  /** Horizontal for navigation, vertical for splash-like spots (Login). */
  layout?: 'horizontal' | 'vertical';
};

export function Logo({ size = 28, layout = 'horizontal' }: LogoProps) {
  return (
    <span
      className={
        layout === 'vertical' ? `${styles.logo} ${styles.vertical}` : styles.logo
      }
      style={{ '--logo-h': `${size}px` } as CSSProperties}
    >
      <TymeboxSymbol size={size} />
      <span className={styles.wordmark}>Tymebox</span>
    </span>
  );
}
