import { useState, type FormEvent } from 'react';
import '@fontsource/roboto/500.css';
import { Button } from '../../common/components';
import { signInAsTestUser } from '../../common/services/auth';
import { usingEmulators } from '../../common/services/database';
import { useAuthStore } from '../auth';
import styles from './Landing.module.css';

/** Google's "G", exactly as their sign-in button guidelines ship it. */
function GoogleMark() {
  return (
    <svg className={styles.googleMark} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/**
 * The official "Continue with Google" button (Google Identity branding
 * guidelines: Roboto Medium, the standard "G", the light or dark theme
 * colours), with its error and the emulator-only test sign-in.
 */
export function SignInButton() {
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
    <div className={styles.signIn}>
      <button
        type="button"
        className={styles.google}
        onClick={() => void onSignIn()}
        disabled={busy}
      >
        <GoogleMark />
        <span>{busy ? 'Signing in…' : 'Continue with Google'}</span>
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Local emulators only: sign in as any made-up address to try sharing. */
export function TestSignIn() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!usingEmulators) {
    return null;
  }

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
