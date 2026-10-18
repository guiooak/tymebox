import { useState } from 'react';
import { Icon } from '../common/components';
import { useT } from '../common/services/i18n';
import { NavLink, paths } from '../common/services/router';
import { TABLET_QUERY } from '../common/services/viewport';
import { useAuthStore } from '../features/auth';
import { Logo, TymeboxSymbol } from '../features/brand';
import { LanguageSelect } from './LanguageSelect';
import { ThemeToggle } from './ThemeToggle';
import { useNavItems } from './useNavItems';
import styles from './AppSidebar.module.css';

const STORAGE_KEY = 'tw-sidebar-collapsed';

/** The user's last choice, else collapsed on tablets (room for the board) and open on desktop. */
function initialCollapsed(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      return stored === '1';
    }
  } catch {
    // Storage blocked: fall through to the size-based default.
  }
  return (
    typeof window.matchMedia === 'function' && window.matchMedia(TABLET_QUERY).matches
  );
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.link} ${styles.active}` : styles.link;

export function AppSidebar() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const t = useT();
  const items = useNavItems();

  const [collapsed, setCollapsed] = useState(initialCollapsed);

  // Remembered only once the user picks, so a tablet's default doesn't stick
  // to the desktop.
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // Not remembered; it still toggles.
    }
  };
  const displayName = user?.displayName ?? user?.email ?? '';
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <aside
      className={collapsed ? `${styles.sidebar} ${styles.collapsed}` : styles.sidebar}
    >
      <NavLink to={paths.home} className={styles.brand} aria-label={t.shell.homeAria}>
        {collapsed ? <TymeboxSymbol size={28} /> : <Logo size={28} />}
      </NavLink>

      <nav className={styles.nav} aria-label={t.shell.mainNav}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={linkClass}
            title={item.label}
          >
            <Icon name={item.icon} className={styles.icon} />
            <span className={styles.label}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.user}>
        <LanguageSelect className={styles.language} />
        <ThemeToggle
          className={styles.themeToggle}
          iconClassName={styles.icon}
          labelClassName={styles.label}
        />
        <div className={styles.identity} title={displayName}>
          <span className={styles.avatarSlot} aria-hidden="true">
            {user?.photoURL ? (
              <img
                className={styles.avatar}
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className={styles.avatarFallback}>{initial}</span>
            )}
          </span>
          <span className={styles.name}>{displayName}</span>
        </div>
        <button
          className={styles.signOut}
          onClick={() => void signOut()}
          title={t.shell.signOut}
          aria-label={t.shell.signOut}
        >
          <Icon name="signOut" className={styles.icon} />
          <span className={styles.label}>{t.shell.signOut}</span>
        </button>
      </div>

      <button
        className={styles.toggle}
        onClick={toggle}
        aria-label={collapsed ? t.shell.expandMenu : t.shell.collapseMenu}
        title={collapsed ? t.shell.expandMenu : t.shell.collapseMenu}
      >
        {collapsed ? '»' : '«'}
      </button>
    </aside>
  );
}
