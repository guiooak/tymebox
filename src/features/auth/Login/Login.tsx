import { useState } from 'react';
import { Button, Paragraph } from '../../../common/components';
import { Logo } from '../../brand';
import { useAuthStore } from '../authStore';
import styles from './Login.module.css';

export function Login() {
  const signIn = useAuthStore((state) => state.signIn);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSignIn = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn();
    } catch {
      setError('Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.brand}>
          <Logo size={72} layout="vertical" />
        </h1>
        <Paragraph className={styles.tagline}>
          Timebox your events and focus only on what matters.
        </Paragraph>
        <Button block onClick={onSignIn} disabled={busy}>
          {busy ? 'Signing in…' : 'Continue with Google'}
        </Button>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
