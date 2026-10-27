import { useState } from 'react';
import { Icon, Modal } from '../common/components';
import { useT } from '../common/services/i18n';
import { PrivacyAndData } from '../features/account';
import { useAuthStore } from '../features/auth';
import { LanguageSelect, ThemeToggle } from '../features/preferences';
import styles from './AccountMenu.module.css';

/** The signed-in user's photo, or the first letter of their name or email. */
export function Avatar({ size = 32 }: { size?: number }) {
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
 * The account menu, from the sidebar and the phone's top bar: who you are,
 * language, theme, privacy and data, and sign out.
 */
export function AccountMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <>
      <Modal open={open} onClose={onClose} title={t.shell.account} closeOnOverlayClick>
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
            className={styles.row}
            onClick={() => {
              onClose();
              setPrivacyOpen(true);
            }}
          >
            <Icon name="shield" className={styles.rowIcon} />
            <span className={styles.rowLabel}>{t.account.open}</span>
          </button>
          <button
            type="button"
            className={`${styles.row} ${styles.signOut}`}
            onClick={() => {
              onClose();
              void signOut();
            }}
          >
            <Icon name="signOut" className={styles.rowIcon} />
            <span className={styles.rowLabel}>{t.shell.signOut}</span>
          </button>
        </div>
      </Modal>
      <PrivacyAndData open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </>
  );
}
