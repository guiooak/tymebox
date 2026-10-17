import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { firebaseApp, usingEmulators } from '../database';

const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

if (usingEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}

/**
 * Emulator only: sign in as a made-up Google account, to try sharing between
 * people locally. The Auth emulator accepts an unsigned token for this.
 */
export async function signInAsTestUser(
  email: string,
  name = email.split('@')[0],
): Promise<void> {
  if (!usingEmulators) {
    throw new Error('Test sign-in only works against the Firebase emulators');
  }
  const token = JSON.stringify({ sub: email, email, email_verified: true, name });
  await signInWithCredential(auth, GoogleAuthProvider.credential(token));
}

export type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) {
    return null;
  }
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider);
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/** Observe auth state. Calls back with the user (or null) and returns an unsubscribe. */
export function observeAuth(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => callback(toAuthUser(user)));
}
