import {
  newKey,
  read,
  subscribe,
  subscribeWhere,
  updateAt,
  writeMany,
} from '../../../../common/services/database';
import { nowISO } from '../../../../common/services/datetime';
import type { AccessRequest, Member } from '../access';
import {
  normalizeMeeting,
  persistedTopic,
  toStoredMeeting,
  type RawMeeting,
} from '../meetingShape';
import type { Goal, Meeting, SideTopic } from '../types';
import { accessPath, eventPath, type Unsubscribe } from './paths';

/* meetings/$id: the events themselves. */

/** The events this user owns. */
export function subscribeOwnMeetings(
  uid: string,
  callback: (meetings: Meeting[]) => void,
): Unsubscribe {
  return subscribeWhere<RawMeeting>('meetings', 'owner', uid, (value) => {
    callback(Object.entries(value ?? {}).map(([id, raw]) => normalizeMeeting(raw, id)));
  });
}

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
