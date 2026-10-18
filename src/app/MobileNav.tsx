import { useState } from 'react';
import { Icon, Modal } from '../common/components';
import { useT } from '../common/services/i18n';
import { NavLink, paths } from '../common/services/router';
import { useAuthStore } from '../features/auth';
import { Logo } from '../features/brand';
import { LanguageSelect } from './LanguageSelect';
import { ThemeToggle } from './ThemeToggle';
import { useNavItems } from './useNavItems';
import styles from './MobileNav.module.css';

function Avatar({ size = 32 }: { size?: number }) {
  const user = useAuthStore((state) => state.user);
  const name = user?.displayName ?? user?.email ?? '';
  return user?.photoURL ? (
    <img
      className={styles.avatar}
      src={user.photoURL}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
    />
  ) : (
    <span className={styles.avatarFallback} style={{ width: size, height: size }}>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/**
 * Phones: a slim bar with the logo and the account menu (who you are,
 * language, theme, sign out). The destinations live in the bottom tab bar.
 */
export function MobileTopBar() {
  const t = useT();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
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
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t.shell.account}
        closeOnOverlayClick
      >
        <div className={styles.account}>
          <div className={styles.identity}>
            <Avatar size={40} />
            <div className={styles.identityText}>
              <strong>{user?.displayName ?? user?.email}</strong>
              {user?.displayName && <span>{user.email}</span>}
            </div>
          </div>
          <LanguageSelect className={styles.row} />
          <ThemeToggle
            className={styles.row}
            iconClassName={styles.rowIcon}
            labelClassName={styles.rowLabel}
          />
          <button
            type="button"
            className={`${styles.row} ${styles.signOut}`}
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
          >
            <Icon name="signOut" className={styles.rowIcon} />
            <span className={styles.rowLabel}>{t.shell.signOut}</span>
          </button>
        </div>
      </Modal>
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
