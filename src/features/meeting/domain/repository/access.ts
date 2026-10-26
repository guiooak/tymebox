import { subscribe, updateAt, writeMany } from '../../../../common/services/database';
import {
  emailKey,
  type AccessSettings,
  type GrantedRole,
  type Member,
  type Visibility,
} from '../access';
import { accessPath, type Unsubscribe } from './paths';

/* meetingAccess/$id and sharedWith/$emailKey: who can see an event. */

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
