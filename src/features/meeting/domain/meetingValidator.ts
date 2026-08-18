import type { Meeting } from './types';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** Lightweight shape/type guard run before persisting a meeting. */
export function isValidMeeting(
  meeting: Partial<Meeting> | null | undefined,
): meeting is Meeting {
  if (!meeting) {
    return false;
  }
  // Expected times stay optional until the event is started — a draft is valid
  // with just an id and a title.
  const hasCore = isNonEmptyString(meeting.id) && isNonEmptyString(meeting.name);
  if (!hasCore) {
    return false;
  }
  const goalsValid =
    Array.isArray(meeting.goals) &&
    meeting.goals.every(
      (goal) => isNonEmptyString(goal?.id) && isNonEmptyString(goal?.name),
    );
  return goalsValid;
}
