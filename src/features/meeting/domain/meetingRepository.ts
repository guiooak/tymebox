import {
  newKey,
  removeAt,
  subscribe,
  updateAt,
  write,
} from '../../../common/services/database';
import { nowISO } from '../../../common/services/datetime';
import { toSideTopics } from './sideTopics';
import type { Goal, Meeting, SideTopic } from './types';

const userPath = (uid: string) => `users/${uid}`;
const settingsPath = (uid: string) => `users/${uid}/settings`;
const meetingsPath = (uid: string) => `users/${uid}/meetings`;
const meetingPath = (uid: string, id: string) => `users/${uid}/meetings/${id}`;

export type UserMeetingData = {
  currentMeetingId: string | null;
  meetings: Meeting[];
  decisionsAutomaticBehavior: boolean;
};

type RawUserNode = {
  currentMeetingId?: string | null;
  settings?: { decisionsAutomaticBehavior?: boolean };
  meetings?: Record<string, Partial<Meeting>> | Array<Partial<Meeting> | null>;
};

function toArray<T>(value: Record<string, T> | Array<T | null> | undefined | null): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value)
    ? value.filter((item): item is T => item != null)
    : Object.values(value);
}

function normalizeGoal(goal: Partial<Goal>): Goal {
  return {
    id: goal.id ?? '',
    name: goal.name ?? '',
    weight: Number(goal.weight) || 1,
    finishedAt: goal.finishedAt ?? '',
    decisions: goal.decisions ?? '',
  };
}

/** The stored shape of a topic (the key is the path, not a field). */
function persistedTopic({ id, value, goalName }: SideTopic) {
  return { id, value, goalName };
}

function normalizeMeeting(raw: Partial<Meeting>): Meeting {
  return {
    id: raw.id ?? '',
    name: raw.name ?? '',
    description: raw.description ?? '',
    expectedStartTime: raw.expectedStartTime ?? '',
    expectedEndTime: raw.expectedEndTime ?? '',
    realStartTime: raw.realStartTime ?? '',
    realEndTime: raw.realEndTime ?? '',
    goals: toArray<Partial<Goal>>(raw.goals).map(normalizeGoal),
    sideTopics: toSideTopics(raw.sideTopics),
    status: raw.status ?? 'draft',
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
  };
}

export function subscribeUserData(
  uid: string,
  callback: (data: UserMeetingData) => void,
): () => void {
  return subscribe<RawUserNode>(userPath(uid), (node) => {
    callback({
      currentMeetingId: node?.currentMeetingId ?? null,
      decisionsAutomaticBehavior: node?.settings?.decisionsAutomaticBehavior ?? true,
      meetings: toArray<Partial<Meeting>>(node?.meetings).map(normalizeMeeting),
    });
  });
}

export function newMeetingId(uid: string): string {
  return newKey(meetingsPath(uid));
}

export async function saveMeeting(uid: string, meeting: Meeting): Promise<void> {
  await write(meetingPath(uid, meeting.id), {
    ...meeting,
    sideTopics: meeting.sideTopics.map(persistedTopic),
    updatedAt: nowISO(),
  });
}

export async function patchMeeting(
  uid: string,
  id: string,
  patch: Partial<Meeting>,
): Promise<void> {
  await updateAt(meetingPath(uid, id), { ...patch, updatedAt: nowISO() });
}

/*
 * Side topics are written one at a time, at their own path. Rewriting the whole
 * list from a component's copy let an older copy land after a newer change and
 * drop a just-added topic.
 */

/** Reserve the key for a new topic; it sorts after every existing one. */
export function newSideTopicKey(uid: string, meetingId: string): string {
  return newKey(`${meetingPath(uid, meetingId)}/sideTopics`);
}

export async function putSideTopic(
  uid: string,
  meetingId: string,
  key: string,
  topic: SideTopic,
): Promise<void> {
  await updateAt(meetingPath(uid, meetingId), {
    [`sideTopics/${key}`]: persistedTopic(topic),
    updatedAt: nowISO(),
  });
}

export async function setSideTopicValue(
  uid: string,
  meetingId: string,
  key: string,
  value: string,
): Promise<void> {
  await updateAt(meetingPath(uid, meetingId), {
    [`sideTopics/${key}/value`]: value,
    updatedAt: nowISO(),
  });
}

export async function deleteSideTopic(
  uid: string,
  meetingId: string,
  key: string,
): Promise<void> {
  await updateAt(meetingPath(uid, meetingId), {
    [`sideTopics/${key}`]: null,
    updatedAt: nowISO(),
  });
}

export async function removeMeeting(uid: string, id: string): Promise<void> {
  await removeAt(meetingPath(uid, id));
}

export async function setCurrentMeetingId(uid: string, id: string | null): Promise<void> {
  await updateAt(userPath(uid), { currentMeetingId: id });
}

export async function setAutomaticBehavior(uid: string, value: boolean): Promise<void> {
  await updateAt(settingsPath(uid), { decisionsAutomaticBehavior: value });
}
