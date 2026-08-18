import { uid } from '../../../common/services/uid';

export type Goal = {
  id: string;
  name: string;
  weight: number;
  finishedAt: string;
  decisions: string;
};

export type SideTopic = {
  id: string;
  value: string;
  /** Name of the goal that was open when the topic was parked ('' when none). */
  goalName: string;
};

export type MeetingStatus = 'draft' | 'active' | 'cancelled' | 'finished';

export type Meeting = {
  id: string;
  name: string;
  description: string;
  /** Both expected times are optional until the event is started. */
  expectedStartTime: string;
  expectedEndTime: string;
  realStartTime: string;
  realEndTime: string;
  goals: Goal[];
  sideTopics: SideTopic[];
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
};

export function createGoal(name: string, weight = 1): Goal {
  return { id: uid(), name, weight, finishedAt: '', decisions: '' };
}

/** Clone a goal as a fresh, unstarted one: name and weight carry over, progress doesn't. */
export function duplicateGoal(goal: Goal): Goal {
  return {
    id: uid(),
    name: goal.name,
    weight: goal.weight,
    finishedAt: '',
    decisions: '',
  };
}

export function createSideTopic(goalName = ''): SideTopic {
  return { id: uid(), value: '', goalName };
}

export function isMeetingActive(meeting: Meeting): boolean {
  return !!meeting.realStartTime;
}

export function isMeetingFinished(meeting: Meeting): boolean {
  return !!meeting.realEndTime;
}

/** A schedule only exists once both ends of the window are set. */
export function hasSchedule(
  meeting: Pick<Meeting, 'expectedStartTime' | 'expectedEndTime'>,
): boolean {
  return !!meeting.expectedStartTime && !!meeting.expectedEndTime;
}

/** Move an item within a list, returning a new array. Out-of-range moves are no-ops. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
