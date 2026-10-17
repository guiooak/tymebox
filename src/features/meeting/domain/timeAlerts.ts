import { toTimestamp } from '../../../common/services/datetime';
import { tendencyCrossoverTs, type BurndownItem } from './burndown';
import { hasSchedule, type Meeting } from './types';

/** The two moments a facilitator cares about while looking elsewhere. */
export type AlertThresholds = {
  /** After this the event is trending late (null when it never will be). */
  warnAfterTs: number | null;
  /** The planned end (null while unscheduled). */
  endTs: number | null;
};

export type AlertState = { late: boolean; overdue: boolean };

export type AlertCrossing = 'late' | 'overdue';

export function toBurndownItems(meeting: Pick<Meeting, 'goals'>): BurndownItem[] {
  return meeting.goals.map((goal) => ({
    id: goal.id,
    title: goal.name,
    weight: goal.weight,
    finishedAt: goal.finishedAt || null,
  }));
}

export function alertThresholds(
  meeting: Pick<Meeting, 'goals' | 'expectedStartTime' | 'expectedEndTime'>,
): AlertThresholds {
  if (!hasSchedule(meeting)) {
    return { warnAfterTs: null, endTs: null };
  }
  const startTs = toTimestamp(meeting.expectedStartTime);
  const endTs = toTimestamp(meeting.expectedEndTime);
  return {
    warnAfterTs: tendencyCrossoverTs(toBurndownItems(meeting), startTs, endTs),
    endTs,
  };
}

/** Where the event stands at `now`. Overdue wins over late. */
export function alertState(
  { warnAfterTs, endTs }: AlertThresholds,
  now: number,
): AlertState {
  const overdue = endTs != null && now >= endTs;
  const late = !overdue && warnAfterTs != null && now >= warnAfterTs;
  return { late, overdue };
}

/**
 * The thresholds crossed between two checks. An alert fires on the way *into*
 * a state, so it re-arms once the event is back on track (a milestone done, the
 * end time pushed out) and fires again if it slips. `previous` is null for the
 * first check, which reports a state already entered.
 */
export function alertCrossings(
  previous: AlertState | null,
  next: AlertState,
): AlertCrossing[] {
  const crossed: AlertCrossing[] = [];
  if (next.late && !previous?.late) {
    crossed.push('late');
  }
  if (next.overdue && !previous?.overdue) {
    crossed.push('overdue');
  }
  return crossed;
}
