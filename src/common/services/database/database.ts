import {
  child,
  equalTo,
  get,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  set,
  update,
} from 'firebase/database';
import { getDb } from './firebaseApp';

/** Read a value once; returns null when the path doesn't exist. */
export async function read<T>(path: string): Promise<T | null> {
  const snapshot = await get(ref(getDb(), path));
  return snapshot.exists() ? (snapshot.val() as T) : null;
}

/** Overwrite the value at a path. */
export async function write<T>(path: string, value: T): Promise<void> {
  await set(ref(getDb(), path), value);
}

/** Merge a partial object into the value at a path. */
export async function updateAt(
  path: string,
  value: Record<string, unknown>,
): Promise<void> {
  await update(ref(getDb(), path), value);
}

/** Delete the value at a path. */
export async function removeAt(path: string): Promise<void> {
  await remove(ref(getDb(), path));
}

/**
 * Several paths, written together or not at all. Keys are paths from the
 * database root; a null value deletes.
 */
export async function writeMany(changes: Record<string, unknown>): Promise<void> {
  await update(ref(getDb()), changes);
}

/**
 * Subscribe to live changes at a path. Returns an unsubscribe function.
 * `onDenied` runs when the rules refuse the read (or later revoke it); the
 * subscription has ended by then.
 */
export function subscribe<T>(
  path: string,
  callback: (value: T | null) => void,
  onDenied?: (error: Error) => void,
): () => void {
  return onValue(
    ref(getDb(), path),
    (snapshot) => {
      callback(snapshot.exists() ? (snapshot.val() as T) : null);
    },
    (error) => onDenied?.(error),
  );
}

/** Read once the children of `path` whose `field` equals `value`. */
export async function readWhere<T>(
  path: string,
  field: string,
  value: string,
): Promise<Record<string, T> | null> {
  const snapshot = await get(
    query(ref(getDb(), path), orderByChild(field), equalTo(value)),
  );
  return snapshot.exists() ? (snapshot.val() as Record<string, T>) : null;
}

/** Subscribe to the children of `path` whose `field` equals `value`. */
export function subscribeWhere<T>(
  path: string,
  field: string,
  value: string,
  callback: (value: Record<string, T> | null) => void,
  onDenied?: (error: Error) => void,
): () => void {
  return onValue(
    query(ref(getDb(), path), orderByChild(field), equalTo(value)),
    (snapshot) => {
      callback(snapshot.exists() ? (snapshot.val() as Record<string, T>) : null);
    },
    (error) => onDenied?.(error),
  );
}

/** Generate a new push key under a path without writing anything. */
export function newKey(path: string): string {
  const key = push(child(ref(getDb()), path)).key;
  if (!key) {
    throw new Error('Failed to generate a database key');
  }
  return key;
}
