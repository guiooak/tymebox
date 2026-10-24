import { Container } from '../common/components';
import { useT } from '../common/services/i18n';
import { TymeboxSymbol } from '../features/brand';
import { LegalLinks } from '../features/legal';
import styles from './AppFooter.module.css';

export function AppFooter() {
  const t = useT();
  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.row}>
          <span className={styles.line}>
            <span>{t.shell.footerBefore}</span>
            <TymeboxSymbol size={14} />
            <span>{t.shell.footerAfter}</span>
          </span>
          <LegalLinks className={styles.links} />
        </div>
      </Container>
    </footer>
  );
}
