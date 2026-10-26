import { subscribe, updateAt } from '../../../../common/services/database';
import { isLocale, type Locale } from '../../../../common/services/i18n';
import type { RawMeeting } from '../meetingShape';
import { userPath, type Unsubscribe } from './paths';

/* users/$uid: the signed-in user's own data. */

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
