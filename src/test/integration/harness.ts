import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { getAuth } from 'firebase/auth';
import { goOffline, goOnline } from 'firebase/database';
import rules from '../../../database.rules.json?raw';
import { signInAsTestUser } from '../../common/services/auth';
import { firebaseApp, getDb } from '../../common/services/database/firebaseApp';
import type { Meeting } from '../../features/meeting/domain/types';
import {
  createMeeting,
  newMeetingId,
} from '../../features/meeting/domain/meetingRepository';
import { makeMeeting } from '../fixtures';

/*
 * Layer 4: the app's real repositories against the emulators, with the real
 * rules. Each test signs in as whoever acts next (the Auth emulator accepts
 * made-up Google accounts) and checks the database with the rules off.
 */

export type Person = { uid: string; email: string; name: string };

let env: RulesTestEnvironment;

/** The app's database (the test environment defaults to another namespace). */
const APP_DATABASE = import.meta.env.VITE_FIREBASE_DATABASE_URL as string;

async function asAdmin(run: (root: ReturnType<typeof rootRef>) => Promise<void>) {
  await env.withSecurityRulesDisabled(async (context) => run(rootRef(context)));
}

function rootRef(
  context: Parameters<
    Parameters<RulesTestEnvironment['withSecurityRulesDisabled']>[0]
  >[0],
) {
  return context.database(APP_DATABASE).ref();
}

export async function startEnvironment(): Promise<void> {
  env = await initializeTestEnvironment({
    projectId: 'demo-tymebox',
    database: { rules },
  });
}

export async function stopEnvironment(): Promise<void> {
  await env.cleanup();
}

export async function clearDatabase(): Promise<void> {
  await asAdmin((root) => root.set(null));
}

/**
 * Sign the app in as this person. The database connection is restarted so
 * the next request already carries the new identity.
 */
export async function signInAs(email: string): Promise<Person> {
  await signInAsTestUser(email);
  const db = getDb();
  goOffline(db);
  goOnline(db);
  const user = getAuth(firebaseApp).currentUser;
  if (!user) {
    throw new Error(`Sign-in as ${email} failed`);
  }
  return { uid: user.uid, email, name: email.split('@')[0] };
}

/** The value at a path, read with the rules off. */
export async function peek<T = unknown>(path = ''): Promise<T | null> {
  let value: T | null = null;
  await asAdmin(async (root) => {
    const snapshot = await (path ? root.child(path) : root).get();
    value = snapshot.exists() ? (snapshot.val() as T) : null;
  });
  return value;
}

/** Write with the rules off, to set up a case the app can't reach by itself. */
export async function plant(path: string, value: unknown): Promise<void> {
  await asAdmin((root) => root.child(path).set(value));
}

/** An event created by the signed-in person through the app's own code. */
export async function createEventAs(owner: Person, over: Partial<Meeting> = {}) {
  const meeting = makeMeeting({
    id: newMeetingId(),
    owner: owner.uid,
    ownerName: owner.name,
    ...over,
  });
  await createMeeting(meeting);
  return meeting;
}

/** Rejected by the rules. */
export const DENIED = /permission[_ ]denied/i;
