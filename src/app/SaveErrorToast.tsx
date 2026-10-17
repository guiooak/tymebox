import { useEffect, useState } from 'react';
import { CloseButton } from '../common/components';
import styles from './SaveErrorToast.module.css';

const HIDE_AFTER_MS = 8000;

/** A rejected Firebase write: a rules rejection or a failed request. */
function isSaveError(reason: unknown): boolean {
  if (!reason || typeof reason !== 'object') {
    return false;
  }
  const { code, message, name } = reason as {
    code?: unknown;
    message?: unknown;
    name?: unknown;
  };
  const text = `${String(code ?? '')} ${String(message ?? '')}`;
  return name === 'FirebaseError' || /permission[_ ]denied|firebase/i.test(text);
}

/**
 * Board actions are fire-and-forget (`void updateGoal(...)`), so a write the
 * server rejects used to vanish: Firebase showed the change, then quietly
 * rolled it back. Any such rejection now raises a visible message.
 */
export function SaveErrorToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isSaveError(event.reason)) {
        return;
      }
      setMessage(
        /permission/i.test(String((event.reason as { message?: unknown }).message ?? ''))
          ? 'Your last change wasn’t saved: the server refused it. Reload and try again; if it keeps happening, the database rules may be out of date.'
          : 'Your last change wasn’t saved. Check your connection and try again.',
      );
    };
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }
    const id = setTimeout(() => setMessage(null), HIDE_AFTER_MS);
    return () => clearTimeout(id);
  }, [message]);

  if (!message) {
    return null;
  }
  return (
    <div className={styles.toast} role="alert">
      <span>{message}</span>
      <CloseButton onClick={() => setMessage(null)} label="Dismiss" />
    </div>
  );
}
