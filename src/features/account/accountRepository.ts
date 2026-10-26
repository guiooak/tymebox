import {
  deleteCurrentUser,
  reauthenticate,
  type AuthUser,
} from '../../common/services/auth';
import { read, readWhere, removeAt, writeMany } from '../../common/services/database';
import { emailKey } from '../meeting/domain/access';
import { deleteMeetingEverywhere } from '../meeting/domain/meetingRepository';
import { normalizeMeeting, type RawMeeting } from '../meeting/domain/meetingShape';

/*
 * The data subject's rights (LGPD art. 18) for one account: see everything we
 * keep about you, take it with you, and delete it. Everything here runs as the
 * signed-in user, within the database rules; there is no backend.
 */

export type AccountUser = Pick<AuthUser, 'uid' | 'displayName' | 'photoURL'> & {
  email: string;
};

type Access = {
  owner: string | null;
  visibility: string | null;
  publicRole: string | null;
  members: Record<string, unknown>;
};

/** Only the owner can read the whole access node, field by field. */
async function readAccess(id: string): Promise<Access> {
  const base = `meetingAccess/${id}`;
  const [owner, visibility, publicRole, members] = await Promise.all([
    read<string>(`${base}/owner`),
    read<string>(`${base}/visibility`),
    read<string>(`${base}/publicRole`),
    read<Record<string, unknown>>(`${base}/members`),
  ]);
  return { owner, visibility, publicRole, members: members ?? {} };
}

const isShared = (access: Access) =>
  access.visibility === 'public' || Object.keys(access.members).length > 0;

async function ownEvents(uid: string): Promise<Record<string, RawMeeting>> {
  return (await readWhere<RawMeeting>('meetings', 'owner', uid)) ?? {};
}

export type AccountSummary = { events: number; sharedEvents: number };

/** How many events you own, and how many of them others can open. */
export async function summarizeAccount(uid: string): Promise<AccountSummary> {
  const ids = Object.keys(await ownEvents(uid));
  const accesses = await Promise.all(ids.map(readAccess));
  return { events: ids.length, sharedEvents: accesses.filter(isShared).length };
}

/** The browser's own Tymebox settings (theme, language, layout). */
function browserSettings(): Record<string, string> {
  const settings: Record<string, string> = {};
  try {
    for (const [name, value] of Object.entries(localStorage)) {
      if (name.startsWith('tw-')) {
        settings[name] = String(value);
      }
    }
  } catch {
    // Storage can be blocked; the export just goes without it.
  }
  return settings;
}

/** Everything Tymebox keeps about you, as one JSON-ready object. */
export async function exportAccount(user: AccountUser) {
  const key = emailKey(user.email);
  const [profile, events, sharedWithMe] = await Promise.all([
    read<Record<string, unknown>>(`users/${user.uid}`),
    ownEvents(user.uid),
    read<Record<string, unknown>>(`sharedWith/${key}`),
  ]);
  const ownEventsWithAccess = await Promise.all(
    Object.entries(events).map(async ([id, event]) => ({
      event,
      access: await readAccess(id),
      accessRequests: (await read<Record<string, unknown>>(`accessRequests/${id}`)) ?? {},
    })),
  );
  const requested = Object.keys((profile?.requested as Record<string, unknown>) ?? {});
  const requestsFiled = (
    await Promise.all(
      requested.map(async (id) => ({
        eventId: id,
        request: await read<Record<string, unknown>>(`accessRequests/${id}/${key}`),
      })),
    )
  ).filter((entry) => entry.request);

  return {
    exportedAt: new Date().toISOString(),
    account: {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    },
    profile: profile ?? {},
    events: ownEventsWithAccess,
    sharedWithMe: sharedWithMe ?? {},
    requestsFiled,
    browser: browserSettings(),
  };
}

export type AccountExport = Awaited<ReturnType<typeof exportAccount>>;

/**
 * Delete the account and everything in it. Asks Google to sign in again
 * first (a cancelled popup stops here, with nothing deleted), then removes:
 * your events, for everyone; your place in events shared with you; the
 * requests you filed; your user node; and finally the sign-in account.
 * Each step can run again, so a failure part-way can simply be retried.
 * `beforeErasing` runs once the sign-in succeeded, before anything is erased.
 */
export async function deleteAccount(
  user: AccountUser,
  beforeErasing?: () => void,
): Promise<void> {
  await reauthenticate();
  // The app's live listeners would otherwise write back into the profile
  // (its language, say) as it disappears.
  beforeErasing?.();
  const key = emailKey(user.email);

  const events = await ownEvents(user.uid);
  for (const [id, raw] of Object.entries(events)) {
    await deleteMeetingEverywhere(normalizeMeeting(raw, id));
  }

  const shared = (await read<Record<string, unknown>>(`sharedWith/${key}`)) ?? {};
  for (const id of Object.keys(shared)) {
    await writeMany({
      [`meetingAccess/${id}/members/${key}`]: null,
      [`sharedWith/${key}/${id}`]: null,
    });
  }

  const requested =
    (await read<Record<string, unknown>>(`users/${user.uid}/requested`)) ?? {};
  for (const id of Object.keys(requested)) {
    const owner = await read<string>(`meetingAccess/${id}/owner`);
    await writeMany({
      [`accessRequests/${id}/${key}`]: null,
      ...(owner ? { [`requestsByOwner/${owner}/${id}/${key}`]: null } : {}),
    });
  }

  await removeAt(`users/${user.uid}`);
  await deleteCurrentUser();
  try {
    for (const name of Object.keys(browserSettings())) {
      localStorage.removeItem(name);
    }
  } catch {
    // Nothing to clear when storage is blocked.
  }
}
