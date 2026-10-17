import { toSideTopics } from './sideTopics';
import {
  FIELD_LIMITS,
  type Goal,
  type Meeting,
  type MeetingStatus,
  type SideTopic,
} from './types';

/*
 * How an event is stored at `meetings/$id`, and how it's read back.
 *
 * Goals and side topics are maps keyed by id/key rather than arrays, so each
 * edit writes one item and two people editing different milestones never
 * overwrite each other. Goals carry an `order`; side topics are ordered by key.
 */

export type StoredGoal = Goal & { order: number };
export type StoredTopic = Pick<SideTopic, 'id' | 'value' | 'goalName'>;

export type StoredMeeting = Omit<Meeting, 'goals' | 'sideTopics'> & {
  goals: Record<string, StoredGoal>;
  sideTopics: Record<string, StoredTopic>;
};

type RawList<T> =
  Record<string, Partial<T> | null> | Array<Partial<T> | null> | null | undefined;

export type RawMeeting = Partial<Omit<Meeting, 'goals' | 'sideTopics'>> & {
  goals?: RawList<StoredGoal>;
  sideTopics?: RawList<SideTopic>;
};

const STATUSES: MeetingStatus[] = ['draft', 'active', 'cancelled', 'finished'];

function normalizeGoal(goal: Partial<Goal>, fallbackId: string): Goal {
  return {
    id: goal.id || fallbackId,
    name: goal.name ?? '',
    weight: Number(goal.weight) || 1,
    finishedAt: goal.finishedAt ?? '',
    decisions: goal.decisions ?? '',
  };
}

/**
 * Goals in board order. Reads both the old array shape and the keyed map; in a
 * map, `order` decides and the key breaks ties (or orders items without one).
 */
export function toGoals(raw: RawList<StoredGoal>): Goal[] {
  if (!raw) {
    return [];
  }
  const entries: Array<[string, Partial<StoredGoal> | null]> = Array.isArray(raw)
    ? raw.map((goal, index) => [String(index), goal])
    : Object.entries(raw);
  return entries
    .filter((entry): entry is [string, Partial<StoredGoal>] => entry[1] != null)
    .map(([key, goal], index) => ({ key, goal, order: Number(goal.order ?? index) }))
    .sort((a, b) => a.order - b.order || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map(({ key, goal }) => normalizeGoal(goal, key));
}

export function goalsToRecord(goals: Goal[]): Record<string, StoredGoal> {
  return Object.fromEntries(
    goals.map((goal, order) => [
      goal.id,
      {
        id: goal.id,
        name: goal.name,
        weight: goal.weight,
        finishedAt: goal.finishedAt,
        decisions: goal.decisions,
        order,
      },
    ]),
  );
}

/** The stored fields of a topic; its key is the path, not a field. */
export function persistedTopic({ id, value, goalName }: SideTopic): StoredTopic {
  return { id, value, goalName };
}

function topicsToRecord(topics: SideTopic[]): Record<string, StoredTopic> {
  return Object.fromEntries(
    topics.map((topic, index) => [topic.key ?? String(index), persistedTopic(topic)]),
  );
}

export function normalizeMeeting(raw: RawMeeting, id = raw.id ?? ''): Meeting {
  return {
    id,
    owner: raw.owner ?? '',
    ownerName: raw.ownerName ?? '',
    name: raw.name ?? '',
    description: raw.description ?? '',
    expectedStartTime: raw.expectedStartTime ?? '',
    expectedEndTime: raw.expectedEndTime ?? '',
    realStartTime: raw.realStartTime ?? '',
    realEndTime: raw.realEndTime ?? '',
    goals: toGoals(raw.goals),
    sideTopics: toSideTopics(raw.sideTopics as Parameters<typeof toSideTopics>[0]),
    status: raw.status && STATUSES.includes(raw.status) ? raw.status : 'draft',
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
  };
}

/** The full stored form of an event, for creating it in one write. */
export function toStoredMeeting(meeting: Meeting): StoredMeeting {
  return {
    ...meeting,
    goals: goalsToRecord(meeting.goals),
    sideTopics: topicsToRecord(meeting.sideTopics),
  };
}

/**
 * An event from before sharing (stored under `users/$uid/meetings`), in the
 * shape of `meetings/$id`: same id, the owner recorded, lists turned into maps.
 */
export function fromLegacy(
  raw: RawMeeting,
  id: string,
  owner: string,
  ownerName: string,
): StoredMeeting {
  const meeting = normalizeMeeting(raw, id);
  // Old data was written under looser rules; anything past today's limits
  // would get the whole move refused, so trim it to fit.
  return toStoredMeeting({
    ...meeting,
    owner,
    ownerName: clip(ownerName, FIELD_LIMITS.meetingName),
    name: clip(meeting.name, FIELD_LIMITS.meetingName),
    description: clip(meeting.description, FIELD_LIMITS.meetingDescription),
    goals: meeting.goals.map((goal) => ({
      ...goal,
      name: clip(goal.name, FIELD_LIMITS.goalName),
      decisions: clip(goal.decisions, FIELD_LIMITS.goalDecisions),
      weight: Math.min(Math.max(goal.weight, 1), 100),
    })),
    sideTopics: meeting.sideTopics.map((topic) => ({
      ...topic,
      value: clip(topic.value, FIELD_LIMITS.sideTopic),
      goalName: clip(topic.goalName, FIELD_LIMITS.goalName),
    })),
  });
}

function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}
