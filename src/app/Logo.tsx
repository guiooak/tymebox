import styles from './Logo.module.css';

export function Logo() {
  return (
    <span className={styles.logo}>
      <span className={styles.icon} aria-hidden="true">
        ⏳
      </span>
      <span>
        Tyme<strong>box</strong>
      </span>
    </span>
  );
}
