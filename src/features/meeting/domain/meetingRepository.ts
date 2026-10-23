import {
  newKey,
  read,
  subscribe,
  subscribeWhere,
  updateAt,
  writeMany,
} from '../../../common/services/database';
import { nowISO } from '../../../common/services/datetime';
import { isLocale, type Locale } from '../../../common/services/i18n';
import {
  emailKey,
  requestPhoto,
  type AccessRequest,
  type AccessSettings,
  type GrantedRole,
  type Member,
  type Visibility,
} from './access';
import {
  fromLegacy,
  normalizeMeeting,
  persistedTopic,
  toStoredMeeting,
  type RawMeeting,
} from './meetingShape';
import type { Goal, Meeting, SideTopic } from './types';

/*
 * Where things live:
 *   meetings/$id                         the event (readable per its access)
 *   meetingAccess/$id                    owner, visibility, publicRole, members
 *   sharedWith/$emailKey/$id             "Shared with me" index
 *   accessRequests/$id/$emailKey         pending requests for an event
 *   requestsByOwner/$uid/$id/$emailKey   an owner's pending requests, for Home
 *   users/$uid                           currentMeetingId, settings, visited
 * See database.rules.json for who may read and write each one.
 */

const eventPath = (id: string) => `meetings/${id}`;
const accessPath = (id: string) => `meetingAccess/${id}`;
const userPath = (uid: string) => `users/${uid}`;

type Unsubscribe = () => void;

/* ---------- The signed-in user's own data ---------- */

export type UserData = {
  currentMeetingId: string | null;
  decisionsAutomaticBehavior: boolean;
  /** The interface language saved in the profile, if any. */
  locale: Locale | null;
  visitedIds: string[];
  /** Events from before sharing, still to be moved to meetings/$id. */
  legacy: Record<string, RawMeeting>;
};

type RawUserNode = {
  currentMeetingId?: string | null;
  settings?: { decisionsAutomaticBehavior?: boolean; locale?: string };
  visited?: Record<string, number>;
  meetings?: Record<string, RawMeeting | null> | Array<RawMeeting | null>;
};

function legacyEntries(raw: RawUserNode['meetings']): Record<string, RawMeeting> {
  if (!raw) {
    return {};
  }
  const entries = Array.isArray(raw)
    ? raw.map((meeting, index) => [meeting?.id ?? String(index), meeting] as const)
    : Object.entries(raw);
  return Object.fromEntries(entries.filter(([, meeting]) => meeting != null)) as Record<
    string,
    RawMeeting
  >;
}

export function subscribeUserData(
  uid: string,
  callback: (data: UserData) => void,
): Unsubscribe {
  return subscribe<RawUserNode>(userPath(uid), (node) => {
    callback({
      currentMeetingId: node?.currentMeetingId ?? null,
      decisionsAutomaticBehavior: node?.settings?.decisionsAutomaticBehavior ?? true,
      locale: isLocale(node?.settings?.locale) ? node.settings.locale : null,
      visitedIds: Object.keys(node?.visited ?? {}),
      legacy: legacyEntries(node?.meetings),
    });
  });
}

/** The events this user owns. */
export function subscribeOwnMeetings(
  uid: string,
  callback: (meetings: Meeting[]) => void,
): Unsubscribe {
  return subscribeWhere<RawMeeting>('meetings', 'owner', uid, (value) => {
    callback(Object.entries(value ?? {}).map(([id, raw]) => normalizeMeeting(raw, id)));
  });
}

export type SharedEntry = { id: string; role: GrantedRole; addedAt: number };

/** Events shared with this email, newest first. */
export function subscribeSharedWith(
  email: string,
  callback: (entries: SharedEntry[]) => void,
): Unsubscribe {
  return subscribe<Record<string, { addedAt?: number; role?: GrantedRole }>>(
    `sharedWith/${emailKey(email)}`,
    (value) => {
      callback(
        Object.entries(value ?? {})
          .map(([id, entry]): SharedEntry => ({
            id,
            role: entry.role === 'contributor' ? 'contributor' : 'viewer',
            addedAt: Number(entry.addedAt) || 0,
          }))
          .sort((a, b) => b.addedAt - a.addedAt),
      );
    },
  );
}

export async function setCurrentMeetingId(uid: string, id: string | null): Promise<void> {
  await updateAt(userPath(uid), { currentMeetingId: id });
}

export async function setUserLocale(uid: string, locale: Locale): Promise<void> {
  await updateAt(`${userPath(uid)}/settings`, { locale });
}

export async function setAutomaticBehavior(uid: string, value: boolean): Promise<void> {
  await updateAt(`${userPath(uid)}/settings`, { decisionsAutomaticBehavior: value });
}

/** Remember a public event this user opened, for "Shared with me". */
export async function recordVisit(uid: string, id: string): Promise<void> {
  await updateAt(`${userPath(uid)}/visited`, { [id]: Date.now() });
}

export async function forgetVisit(uid: string, id: string): Promise<void> {
  await updateAt(`${userPath(uid)}/visited`, { [id]: null });
}

/**
 * Move this user's pre-sharing events to meetings/$id, keeping their ids, as
 * private events they own. One atomic write per event: if it already exists
 * there the write is refused and the old copy stays for a later attempt.
 */
export async function migrateLegacyMeetings(
  uid: string,
  ownerName: string,
  legacy: Record<string, RawMeeting>,
): Promise<void> {
  for (const [id, raw] of Object.entries(legacy)) {
    try {
      await writeMany({
        [eventPath(id)]: fromLegacy(raw, id, uid, ownerName),
        [accessPath(id)]: { owner: uid, visibility: 'private', publicRole: 'viewer' },
        [`${userPath(uid)}/meetings/${id}`]: null,
      });
    } catch (error) {
      console.warn(`Could not move event ${id} to shared storage`, error);
    }
  }
}

/* ---------- One event ---------- */

export function newMeetingId(): string {
  return newKey('meetings');
}

export function subscribeMeeting(
  id: string,
  callback: (meeting: Meeting | null) => void,
  onDenied: () => void,
): Unsubscribe {
  return subscribe<RawMeeting>(
    eventPath(id),
    (raw) => callback(raw ? normalizeMeeting(raw, id) : null),
    onDenied,
  );
}

/** Create an event the signed-in user owns, private by default. */
export async function createMeeting(meeting: Meeting): Promise<void> {
  const stamped = { ...meeting, createdAt: nowISO(), updatedAt: nowISO() };
  await writeMany({
    [eventPath(meeting.id)]: toStoredMeeting(stamped),
    [accessPath(meeting.id)]: {
      owner: meeting.owner,
      visibility: 'private',
      publicRole: 'viewer',
    },
  });
}

/** Delete an event with its access settings, shares and pending requests. */
export async function deleteMeeting(
  meeting: Meeting,
  members: Pick<Member, 'key'>[],
  requests: Pick<AccessRequest, 'key'>[],
): Promise<void> {
  const changes: Record<string, unknown> = {
    [eventPath(meeting.id)]: null,
    [accessPath(meeting.id)]: null,
  };
  for (const member of members) {
    changes[`sharedWith/${member.key}/${meeting.id}`] = null;
  }
  for (const request of requests) {
    changes[`accessRequests/${meeting.id}/${request.key}`] = null;
    changes[`requestsByOwner/${meeting.owner}/${meeting.id}/${request.key}`] = null;
  }
  await writeMany(changes);
}

/**
 * Owner only: delete an event that isn't open, looking up who it's shared with
 * and who asked for access first, so nobody keeps a dangling entry.
 */
export async function deleteMeetingEverywhere(meeting: Meeting): Promise<void> {
  const [members, requests] = await Promise.all([
    read<Record<string, unknown>>(`${accessPath(meeting.id)}/members`),
    read<Record<string, unknown>>(`accessRequests/${meeting.id}`),
  ]);
  const keys = (value: Record<string, unknown> | null) =>
    Object.keys(value ?? {}).map((key) => ({ key }));
  await deleteMeeting(meeting, keys(members), keys(requests));
}

export type EventFields = Partial<
  Pick<
    Meeting,
    | 'name'
    | 'description'
    | 'expectedStartTime'
    | 'expectedEndTime'
    | 'realStartTime'
    | 'realEndTime'
    | 'status'
  >
>;

/** Change top-level fields of an event (never its goals or topics wholesale). */
export async function patchMeeting(id: string, patch: EventFields): Promise<void> {
  await updateAt(eventPath(id), { ...patch, updatedAt: nowISO() });
}

/* Goals and side topics: one item per write, so collaborators never overwrite
 * each other's changes with an older copy of the list. */

export async function putGoal(id: string, goal: Goal, order: number): Promise<void> {
  await updateAt(eventPath(id), {
    [`goals/${goal.id}`]: { ...goal, order },
    updatedAt: nowISO(),
  });
}

export async function patchGoal(
  id: string,
  goalId: string,
  patch: Partial<Omit<Goal, 'id'>>,
): Promise<void> {
  const changes: Record<string, unknown> = { updatedAt: nowISO() };
  for (const [field, value] of Object.entries(patch)) {
    changes[`goals/${goalId}/${field}`] = value;
  }
  await updateAt(eventPath(id), changes);
}

export async function deleteGoal(id: string, goalId: string): Promise<void> {
  await updateAt(eventPath(id), { [`goals/${goalId}`]: null, updatedAt: nowISO() });
}

/** Store the board order: only each goal's `order` changes. */
export async function setGoalOrder(id: string, goals: Goal[]): Promise<void> {
  const changes: Record<string, unknown> = { updatedAt: nowISO() };
  goals.forEach((goal, order) => {
    changes[`goals/${goal.id}/order`] = order;
  });
  await updateAt(eventPath(id), changes);
}

/** Restart: clear every completion, along with the given fields. */
export async function resetProgress(
  id: string,
  goals: Goal[],
  patch: EventFields,
): Promise<void> {
  const changes: Record<string, unknown> = { ...patch, updatedAt: nowISO() };
  for (const goal of goals) {
    changes[`goals/${goal.id}/finishedAt`] = '';
  }
  await updateAt(eventPath(id), changes);
}

/** Reserve the key for a new topic; it sorts after every existing one. */
export function newSideTopicKey(id: string): string {
  return newKey(`${eventPath(id)}/sideTopics`);
}

export async function putSideTopic(
  id: string,
  key: string,
  topic: SideTopic,
): Promise<void> {
  await updateAt(eventPath(id), {
    [`sideTopics/${key}`]: persistedTopic(topic),
    updatedAt: nowISO(),
  });
}

export async function setSideTopicValue(
  id: string,
  key: string,
  value: string,
): Promise<void> {
  await updateAt(eventPath(id), {
    [`sideTopics/${key}/value`]: value,
    updatedAt: nowISO(),
  });
}

export async function deleteSideTopic(id: string, key: string): Promise<void> {
  await updateAt(eventPath(id), { [`sideTopics/${key}`]: null, updatedAt: nowISO() });
}

/* ---------- Access ---------- */

/**
 * The public part of an event's access settings. Readable by anyone signed in
 * even without access, so the request page can tell who owns the event.
 */
export function subscribeAccessSettings(
  id: string,
  callback: (settings: AccessSettings | null) => void,
): Unsubscribe {
  const parts: Partial<Record<keyof AccessSettings, string | null>> = {};
  const emit = () => {
    if (!('owner' in parts && 'visibility' in parts && 'publicRole' in parts)) {
      return;
    }
    callback(
      parts.owner
        ? {
            owner: parts.owner,
            visibility: parts.visibility === 'public' ? 'public' : 'private',
            publicRole: parts.publicRole === 'contributor' ? 'contributor' : 'viewer',
          }
        : null,
    );
  };
  const watch = (field: keyof AccessSettings) =>
    subscribe<string>(`${accessPath(id)}/${field}`, (value) => {
      parts[field] = value;
      emit();
    });
  const offs = [watch('owner'), watch('visibility'), watch('publicRole')];
  return () => offs.forEach((off) => off());
}

type RawMember = { email?: string; role?: GrantedRole; addedAt?: number };

function toMember(key: string, raw: RawMember): Member {
  return {
    key,
    email: raw.email ?? '',
    role: raw.role === 'contributor' ? 'contributor' : 'viewer',
    addedAt: Number(raw.addedAt) || 0,
  };
}

/** The signed-in user's own entry in an event's member list. */
export function subscribeMyMembership(
  id: string,
  email: string,
  callback: (member: Member | null) => void,
): Unsubscribe {
  const key = emailKey(email);
  return subscribe<RawMember>(`${accessPath(id)}/members/${key}`, (raw) =>
    callback(raw ? toMember(key, raw) : null),
  );
}

/** Owner only: everyone the event is shared with, oldest first. */
export function subscribeMembers(
  id: string,
  callback: (members: Member[]) => void,
): Unsubscribe {
  return subscribe<Record<string, RawMember>>(
    `${accessPath(id)}/members`,
    (value) =>
      callback(
        Object.entries(value ?? {})
          .map(([key, raw]) => toMember(key, raw))
          .sort((a, b) => a.addedAt - b.addedAt),
      ),
    () => callback([]),
  );
}

export async function setVisibility(
  id: string,
  visibility: Visibility,
  publicRole: GrantedRole,
): Promise<void> {
  await updateAt(accessPath(id), { visibility, publicRole });
}

export async function shareWith(
  id: string,
  email: string,
  role: GrantedRole,
): Promise<void> {
  const key = emailKey(email);
  const addedAt = Date.now();
  await writeMany({
    [`${accessPath(id)}/members/${key}`]: { email: email.trim(), role, addedAt },
    [`sharedWith/${key}/${id}`]: { addedAt, role },
  });
}

export async function setMemberRole(
  id: string,
  member: Member,
  role: GrantedRole,
): Promise<void> {
  await writeMany({
    [`${accessPath(id)}/members/${member.key}/role`]: role,
    [`sharedWith/${member.key}/${id}/role`]: role,
  });
}

export async function unshare(id: string, memberKey: string): Promise<void> {
  await writeMany({
    [`${accessPath(id)}/members/${memberKey}`]: null,
    [`sharedWith/${memberKey}/${id}`]: null,
  });
}

/* ---------- Access requests ---------- */

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
    let requests: Record<string, RawRequest>;
    try {
      requests = (await read<Record<string, RawRequest>>(`accessRequests/${id}`)) ?? {};
    } catch {
      // The event is gone (or no longer yours): only its index entry is left.
      changes[indexPath] = null;
      continue;
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
