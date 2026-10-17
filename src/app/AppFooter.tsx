import { Container } from '../common/components';
import { useT } from '../common/services/i18n';
import styles from './AppFooter.module.css';

export function AppFooter() {
  const t = useT();
  return (
    <footer className={styles.footer}>
      <Container>{t.shell.footer}</Container>
    </footer>
  );
}
