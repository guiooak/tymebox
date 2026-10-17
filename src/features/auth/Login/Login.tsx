import { useState, type FormEvent } from 'react';
import { Button, Paragraph } from '../../../common/components';
import { signInAsTestUser } from '../../../common/services/auth';
import { usingEmulators } from '../../../common/services/database';
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
        {usingEmulators && <TestSignIn />}
      </div>
    </div>
  );
}

/** Local emulators only: sign in as any made-up address to try sharing. */
function TestSignIn() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await signInAsTestUser(email.trim());
    } catch {
      setError('Couldn’t sign in to the Auth emulator. Is `yarn dev:emulators` running?');
    }
  };

  return (
    <form className={styles.testSignIn} onSubmit={(event) => void submit(event)}>
      <label htmlFor="test-email">Emulator: sign in as</label>
      <input
        id="test-email"
        type="email"
        required
        value={email}
        placeholder="ana@example.com"
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button type="submit" size="sm" theme="secondary" outline>
        Test sign-in
      </Button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
