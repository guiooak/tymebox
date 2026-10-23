import { useEffect, useState } from 'react';
import { Button, FormInput, Modal, useDialog } from '../../common/components';
import { useLocale, useT } from '../../common/services/i18n';
import { Link, privacyPath } from '../../common/services/router';
import { useAuthStore } from '../auth';
import { useMeetingStore } from '../meeting/store';
import {
  deleteAccount,
  exportAccount,
  summarizeAccount,
  type AccountSummary,
  type AccountUser,
} from './accountRepository';
import styles from './PrivacyAndData.module.css';

export type PrivacyAndDataProps = { open: boolean; onClose: () => void };

/** Hands the export to the browser as a file download. */
function download(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const isPopupClosed = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  [
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request',
    'auth/user-cancelled',
  ].includes(String((error as { code: unknown }).code));

/**
 * "Privacy and data" (LGPD art. 18): what Tymebox keeps about you, a JSON
 * export of all of it, and deleting the account.
 */
export function PrivacyAndData({ open, onClose }: PrivacyAndDataProps) {
  const t = useT().account;
  const locale = useLocale();
  const dialog = useDialog();
  const authUser = useAuthStore((state) => state.user);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [step, setStep] = useState<'overview' | 'delete'>('overview');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const user: AccountUser | null =
    authUser?.email != null
      ? {
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          photoURL: authUser.photoURL,
        }
      : null;
  const uid = user?.uid;

  useEffect(() => {
    if (!open || !uid) {
      return;
    }
    let live = true;
    summarizeAccount(uid)
      .then((value) => live && setSummary(value))
      .catch(() => live && setSummary({ events: 0, sharedEvents: 0 }));
    return () => {
      live = false;
    };
  }, [open, uid]);

  const close = () => {
    if (busy) {
      return;
    }
    setStep('overview');
    setTyped('');
    setError(null);
    setSummary(null);
    onClose();
  };

  const onExport = async () => {
    if (!user) {
      return;
    }
    setBusy('export');
    setError(null);
    try {
      const data = await exportAccount(user);
      download(data, `tymebox-${data.exportedAt.slice(0, 10)}.json`);
    } catch {
      setError(t.exportError);
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async () => {
    if (!user) {
      return;
    }
    setBusy('delete');
    setError(null);
    try {
      await deleteAccount(user, () => useMeetingStore.getState().release());
      setBusy(null);
      onClose();
      await dialog.alert({ title: t.deletedTitle, text: t.deletedText });
    } catch (caught) {
      setBusy(null);
      setError(isPopupClosed(caught) ? t.deleteCancelled : t.deleteError);
    }
  };

  const events = summary?.events ?? 0;
  const shared = summary?.sharedEvents ?? 0;
  const canDelete = typed.trim().toUpperCase() === t.deleteWord && summary !== null;

  return (
    <Modal
      open={open}
      onClose={close}
      title={step === 'delete' ? t.deleteTitle : t.title}
    >
      {step === 'overview' ? (
        <div className={styles.body}>
          <p className={styles.intro}>{t.intro}</p>
          <dl className={styles.facts}>
            <dt>{t.name}</dt>
            <dd>{user?.displayName || '—'}</dd>
            <dt>{t.email}</dt>
            <dd>{user?.email}</dd>
            <dt>{t.photo}</dt>
            <dd>
              {user?.photoURL ? (
                <img
                  className={styles.photo}
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                '—'
              )}
            </dd>
            <dt>{t.events}</dt>
            <dd>{summary ? t.eventsCount(events, shared) : t.counting}</dd>
          </dl>
          <p className={styles.hint}>{t.fromGoogle}</p>
          <p className={styles.hint}>
            <Link to={privacyPath(locale)} onClick={close}>
              {t.policyLink}
            </Link>
          </p>

          <div className={styles.action}>
            <div>
              <strong>{t.export}</strong>
              <p className={styles.hint}>{t.exportHint}</p>
            </div>
            <Button
              theme="secondary"
              outline
              disabled={busy !== null}
              onClick={() => void onExport()}
            >
              {busy === 'export' ? t.exporting : t.export}
            </Button>
          </div>
          <div className={styles.action}>
            <div>
              <strong>{t.delete}</strong>
              <p className={styles.hint}>{t.deleteHint}</p>
            </div>
            <Button
              theme="danger"
              outline
              disabled={busy !== null}
              onClick={() => {
                setError(null);
                setStep('delete');
              }}
            >
              {t.delete}
            </Button>
          </div>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className={styles.body}>
          <p>{t.deleteText(events, shared)}</p>
          <p className={styles.hint}>{t.deleteReauth}</p>
          <label className={styles.confirm}>
            <span>{t.deleteTypeLabel(t.deleteWord)}</span>
            <FormInput
              name="confirm-delete"
              value={typed}
              onChange={setTyped}
              maxLength={20}
            />
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.buttons}>
            <Button
              theme="tertiary"
              disabled={busy !== null}
              onClick={() => {
                setTyped('');
                setError(null);
                setStep('overview');
              }}
            >
              {t.back}
            </Button>
            <Button
              theme="danger"
              disabled={!canDelete || busy !== null}
              onClick={() => void onDelete()}
            >
              {busy === 'delete' ? t.deleting : t.deleteConfirm}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
