import { useEffect, useState } from 'react';
import { Icon } from '../common/components';
import { NavLink, paths } from '../common/services/router';
import { useAuthStore } from '../features/auth';
import { useMeetingStore } from '../features/meeting/store';
import { Logo, TymeboxSymbol } from '../features/brand';
import { ThemeToggle } from './ThemeToggle';
import styles from './AppSidebar.module.css';

const STORAGE_KEY = 'tw-sidebar-collapsed';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.link} ${styles.active}` : styles.link;

export function AppSidebar() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const current = useMeetingStore((state) => state.currentMeeting);

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
      <NavLink to={paths.home} className={styles.brand} aria-label="Tymebox home">
        {collapsed ? <TymeboxSymbol size={28} /> : <Logo size={28} />}
      </NavLink>

      <nav className={styles.nav}>
        <NavLink to={paths.home} end className={linkClass} title="Home">
          <Icon name="home" className={styles.icon} />
          <span className={styles.label}>Home</span>
        </NavLink>
        <NavLink to={paths.newMeeting} className={linkClass} title="New event">
          <Icon name="plus" className={styles.icon} />
          <span className={styles.label}>New event</span>
        </NavLink>
        <NavLink to={paths.meetings} end className={linkClass} title="History">
          <Icon name="history" className={styles.icon} />
          <span className={styles.label}>History</span>
        </NavLink>
        {live && (
          <NavLink to={paths.liveMeeting} className={linkClass} title="Live event">
            <Icon name="timer" className={styles.icon} />
            <span className={styles.label}>Live event</span>
          </NavLink>
        )}
      </nav>

      <div className={styles.user}>
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
          title="Sign out"
          aria-label="Sign out"
        >
          <Icon name="signOut" className={styles.icon} />
          <span className={styles.label}>Sign out</span>
        </button>
      </div>

      <button
        className={styles.toggle}
        onClick={() => setCollapsed((value) => !value)}
        aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
        title={collapsed ? 'Expand menu' : 'Collapse menu'}
      >
        {collapsed ? '»' : '«'}
      </button>
    </aside>
  );
}
