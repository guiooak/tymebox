import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { connectDatabaseEmulator, getDatabase, type Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** The single Firebase app instance, shared by the auth and database services. */
export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);

/** Local development against `yarn dev:emulators` (see .env.emulators). */
export const usingEmulators = import.meta.env.VITE_USE_EMULATORS === '1';

/*
 * App Check: the database only answers requests that come from this app, not
 * from scripts calling the API with a stolen or scripted session. The rules
 * still decide what each person may do. Off on the emulators and whenever no
 * site key is configured; enforcement is switched on in the Firebase console.
 */
const appCheckKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
if (appCheckKey && !usingEmulators) {
  if (import.meta.env.DEV) {
    // Local dev on a real project: Firebase prints a debug token to register.
    (self as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      true;
  }
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(appCheckKey),
    isTokenAutoRefreshEnabled: true,
  });
}

let databaseInstance: Database | null = null;

/** Lazily create the Realtime Database handle (needs a configured databaseURL). */
export function getDb(): Database {
  if (!databaseInstance) {
    databaseInstance = getDatabase(firebaseApp);
    if (usingEmulators) {
      connectDatabaseEmulator(databaseInstance, '127.0.0.1', 9000);
    }
  }
  return databaseInstance;
}
