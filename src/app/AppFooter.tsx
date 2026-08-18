import { Container } from '../common/components';
import styles from './AppFooter.module.css';

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <Container>Tymebox · focus only on what matters</Container>
    </footer>
  );
}
