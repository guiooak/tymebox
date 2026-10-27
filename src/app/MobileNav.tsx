import { useState } from 'react';
import { Icon } from '../common/components';
import { useT } from '../common/services/i18n';
import { NavLink, paths } from '../common/services/router';
import { Logo } from '../features/brand';
import { AccountMenu, Avatar } from './AccountMenu';
import { useNavItems } from './useNavItems';
import styles from './MobileNav.module.css';

/**
 * Phones: a slim bar with the logo and the account menu. The destinations
 * live in the bottom tab bar.
 */
export function MobileTopBar() {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.topBar}>
      <NavLink to={paths.home} className={styles.brand} aria-label={t.shell.homeAria}>
        <Logo size={26} />
      </NavLink>
      <button
        type="button"
        className={styles.accountButton}
        aria-label={t.shell.openAccount}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Avatar />
      </button>
      <AccountMenu open={open} onClose={() => setOpen(false)} />
    </header>
  );
}

/** Phones: the destinations as tabs along the bottom, within thumb's reach. */
export function BottomTabBar() {
  const t = useT();
  const items = useNavItems();
  return (
    <nav className={styles.tabBar} aria-label={t.shell.mainNav} data-tab-bar>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            isActive ? `${styles.tab} ${styles.active}` : styles.tab
          }
        >
          <Icon name={item.icon} size={22} />
          <span className={styles.tabLabel}>{item.short}</span>
        </NavLink>
      ))}
    </nav>
  );
}
