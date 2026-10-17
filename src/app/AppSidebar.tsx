import { useEffect, useState } from 'react';
import { Icon } from '../common/components';
import { useT } from '../common/services/i18n';
import { NavLink, paths, eventPath } from '../common/services/router';
import { useAuthStore } from '../features/auth';
import { useMeetingStore } from '../features/meeting/store';
import { Logo, TymeboxSymbol } from '../features/brand';
import { LanguageSelect } from './LanguageSelect';
import { ThemeToggle } from './ThemeToggle';
import styles from './AppSidebar.module.css';

const STORAGE_KEY = 'tw-sidebar-collapsed';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.link} ${styles.active}` : styles.link;

export function AppSidebar() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const current = useMeetingStore((state) => state.currentMeeting);
  const t = useT();

  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1',
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const live = !!current?.realStartTime && !current?.realEndTime;
  const displayName = user?.displayName ?? user?.email ?? '';
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <aside
      className={collapsed ? `${styles.sidebar} ${styles.collapsed}` : styles.sidebar}
    >
      <NavLink to={paths.home} className={styles.brand} aria-label={t.shell.homeAria}>
        {collapsed ? <TymeboxSymbol size={28} /> : <Logo size={28} />}
      </NavLink>

      <nav className={styles.nav}>
        <NavLink to={paths.home} end className={linkClass} title={t.shell.home}>
          <Icon name="home" className={styles.icon} />
          <span className={styles.label}>{t.shell.home}</span>
        </NavLink>
        <NavLink to={paths.newMeeting} className={linkClass} title={t.shell.newEvent}>
          <Icon name="plus" className={styles.icon} />
          <span className={styles.label}>{t.shell.newEvent}</span>
        </NavLink>
        <NavLink to={paths.meetings} end className={linkClass} title={t.shell.history}>
          <Icon name="history" className={styles.icon} />
          <span className={styles.label}>{t.shell.history}</span>
        </NavLink>
        {live && current && (
          <NavLink
            to={eventPath(current.id)}
            className={linkClass}
            title={t.shell.liveEvent}
          >
            <Icon name="timer" className={styles.icon} />
            <span className={styles.label}>{t.shell.liveEvent}</span>
          </NavLink>
        )}
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
        onClick={() => setCollapsed((value) => !value)}
        aria-label={collapsed ? t.shell.expandMenu : t.shell.collapseMenu}
        title={collapsed ? t.shell.expandMenu : t.shell.collapseMenu}
      >
        {collapsed ? '»' : '«'}
      </button>
    </aside>
  );
}
