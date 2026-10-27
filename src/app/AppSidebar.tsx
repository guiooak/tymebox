import { useState } from 'react';
import { Icon } from '../common/components';
import { useT } from '../common/services/i18n';
import { NavLink, paths } from '../common/services/router';
import { TABLET_QUERY } from '../common/services/viewport';
import { useAuthStore } from '../features/auth';
import { Logo, TymeboxSymbol } from '../features/brand';
import { AccountMenu, Avatar } from './AccountMenu';
import { appVersion } from './appVersion';
import { useNavItems } from './useNavItems';
import styles from './AppSidebar.module.css';

const STORAGE_KEY = 'tw-sidebar-collapsed';

/** The user's last choice, else collapsed on tablets (room for the board) and open on desktop. */
function initialCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      return stored === '1';
    }
  } catch {
    // Storage blocked: fall through to the size-based default.
  }
  return window.matchMedia(TABLET_QUERY).matches;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.link} ${styles.active}` : styles.link;

export function AppSidebar() {
  const user = useAuthStore((state) => state.user);
  const t = useT();
  const items = useNavItems();

  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [accountOpen, setAccountOpen] = useState(false);

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
  const version = appVersion(import.meta.env.VITE_APP_VERSION);

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

      {/* Everything about the account (language, theme, privacy, sign out)
          lives behind this one row, as on phones. */}
      <button
        type="button"
        className={styles.account}
        onClick={() => setAccountOpen(true)}
        aria-haspopup="dialog"
        aria-label={collapsed ? t.shell.openAccount : undefined}
        title={t.shell.openAccount}
      >
        <span className={styles.avatarSlot}>
          <Avatar size={24} />
        </span>
        <span className={styles.who}>
          <span className={styles.name}>{displayName}</span>
          <span className={styles.hint}>{t.shell.accountHint}</span>
        </span>
      </button>
      <AccountMenu open={accountOpen} onClose={() => setAccountOpen(false)} />

      <div className={styles.footer}>
        {/* The running version, small and quiet; no room for it on the rail. */}
        {!collapsed &&
          (version.href ? (
            <a
              className={styles.version}
              href={version.href}
              target="_blank"
              rel="noopener noreferrer"
              title={t.shell.versionNotes}
            >
              {version.label}
            </a>
          ) : (
            <span className={styles.version} title={t.shell.version}>
              {version.label}
            </span>
          ))}
        <button
          className={styles.toggle}
          onClick={toggle}
          aria-label={collapsed ? t.shell.expandMenu : t.shell.collapseMenu}
          title={collapsed ? t.shell.expandMenu : t.shell.collapseMenu}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>
    </aside>
  );
}
