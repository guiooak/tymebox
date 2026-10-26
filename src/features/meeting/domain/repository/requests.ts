import { read, subscribe, writeMany } from '../../../../common/services/database';
import { emailKey, requestPhoto, type AccessRequest, type GrantedRole } from '../access';
import { accessPath, userPath, type Unsubscribe } from './paths';

/* accessRequests/$id and requestsByOwner/$uid: asking to join an event. */

type RawRequest = Partial<Omit<AccessRequest, 'key'>>;

/** Unanswered access requests are kept 30 days (see the Privacy Policy). */
export const REQUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const isExpiredRequest = (
  request: Pick<AccessRequest, 'requestedAt'>,
  now = Date.now(),
) => now - request.requestedAt > REQUEST_TTL_MS;

function toRequest(key: string, raw: RawRequest): AccessRequest {
  return {
    key,
    email: raw.email ?? '',
    name: raw.name ?? '',
    photoURL: raw.photoURL ?? '',
    message: raw.message ?? '',
    requestedAt: Number(raw.requestedAt) || 0,
  };
}

export type Requester = { email: string; name: string; photoURL: string };

/** Your index of the events you asked to join: deleting your account
 * withdraws those requests. Approving or denying can't clear it (the owner
 * can't write to your node), so entries may outlive their request. */
const requestedPath = (uid: string, id: string) => `${userPath(uid)}/requested/${id}`;

export async function requestAccess(
  id: string,
  owner: string,
  uid: string,
  requester: Requester,
  message: string,
): Promise<void> {
  const key = emailKey(requester.email);
  await writeMany({
    [requestedPath(uid, id)]: true,
    [`accessRequests/${id}/${key}`]: {
      email: requester.email,
      name: requester.name,
      photoURL: requestPhoto(requester.photoURL),
      message: message.trim(),
      requestedAt: Date.now(),
    },
    [`requestsByOwner/${owner}/${id}/${key}`]: true,
  });
}

export async function cancelAccessRequest(
  id: string,
  owner: string,
  uid: string,
  email: string,
): Promise<void> {
  const key = emailKey(email);
  await writeMany({
    [requestedPath(uid, id)]: null,
    [`accessRequests/${id}/${key}`]: null,
    [`requestsByOwner/${owner}/${id}/${key}`]: null,
  });
}

/** The signed-in user's own pending request for an event. */
export function subscribeMyRequest(
  id: string,
  email: string,
  callback: (request: AccessRequest | null) => void,
): Unsubscribe {
  const key = emailKey(email);
  return subscribe<RawRequest>(
    `accessRequests/${id}/${key}`,
    (raw) => {
      const request = raw ? toRequest(key, raw) : null;
      callback(request && !isExpiredRequest(request) ? request : null);
    },
    () => callback(null),
  );
}

/** Owner only: pending requests for an event, newest first. */
export function subscribeRequests(
  id: string,
  callback: (requests: AccessRequest[]) => void,
): Unsubscribe {
  return subscribe<Record<string, RawRequest>>(
    `accessRequests/${id}`,
    (value) =>
      callback(
        Object.entries(value ?? {})
          .map(([key, raw]) => toRequest(key, raw))
          .filter((request) => !isExpiredRequest(request))
          .sort((a, b) => b.requestedAt - a.requestedAt),
      ),
    () => callback([]),
  );
}

/** Owner only: how many requests are pending on each of their events. */
export function subscribeRequestsByOwner(
  uid: string,
  callback: (countsByEvent: Record<string, number>) => void,
): Unsubscribe {
  return subscribe<Record<string, Record<string, true>>>(
    `requestsByOwner/${uid}`,
    (value) =>
      callback(
        Object.fromEntries(
          Object.entries(value ?? {}).map(([id, keys]) => [id, Object.keys(keys).length]),
        ),
      ),
  );
}

/**
 * Owner only: delete requests left unanswered for over 30 days, and index
 * entries whose request is already gone. Returns how many entries went.
 */
export async function expireRequests(owner: string, eventIds: string[]): Promise<number> {
  const now = Date.now();
  const changes: Record<string, null> = {};
  for (const id of eventIds) {
    const indexPath = `requestsByOwner/${owner}/${id}`;
    let requests: Record<string, RawRequest> = {};
    try {
      requests = (await read<Record<string, RawRequest>>(`accessRequests/${id}`)) ?? {};
    } catch {
      // The event is gone (or no longer yours): every index entry left is
      // stale. They go one key at a time, the only deletion the rules allow.
    }
    for (const [key, raw] of Object.entries(requests)) {
      if (isExpiredRequest(toRequest(key, raw), now)) {
        changes[`accessRequests/${id}/${key}`] = null;
        changes[`${indexPath}/${key}`] = null;
      }
    }
    const indexed = (await read<Record<string, true>>(indexPath)) ?? {};
    for (const key of Object.keys(indexed)) {
      if (!requests[key]) {
        changes[`${indexPath}/${key}`] = null;
      }
    }
  }
  const count = Object.keys(changes).length;
  if (count > 0) {
    await writeMany(changes);
  }
  return count;
}

export async function approveRequest(
  id: string,
  owner: string,
  request: AccessRequest,
  role: GrantedRole,
): Promise<void> {
  const addedAt = Date.now();
  await writeMany({
    [`${accessPath(id)}/members/${request.key}`]: { email: request.email, role, addedAt },
    [`sharedWith/${request.key}/${id}`]: { addedAt, role },
    [`accessRequests/${id}/${request.key}`]: null,
    [`requestsByOwner/${owner}/${id}/${request.key}`]: null,
  });
}

export async function denyRequest(
  id: string,
  owner: string,
  request: AccessRequest,
): Promise<void> {
  await writeMany({
    [`accessRequests/${id}/${request.key}`]: null,
    [`requestsByOwner/${owner}/${id}/${request.key}`]: null,
  });
}
