import { useMemo } from 'react';
import { toTimestamp } from '../../../common/services/datetime';
import { isFinishedMeeting, onBudgetStreak } from '../domain/metrics';
import type { Meeting } from '../domain/types';
import { useMeetingStore } from '../store';

/**
 * How many events in a row — counting back from this one — finished on budget.
 * Connects a single report to the landing-page metrics so progress reads as a
 * trend, not an isolated number.
 */
export function useReportTrend(meeting: Meeting | null): number {
  const meetings = useMeetingStore((state) => state.meetings);

  return useMemo(() => {
    if (!meeting?.realEndTime) {
      return 0;
    }
    const endTs = toTimestamp(meeting.realEndTime);
    const upToThisOne = meetings
      .filter(isFinishedMeeting)
      .filter((item) => toTimestamp(item.realEndTime) <= endTs)
      .sort((a, b) => toTimestamp(b.realEndTime) - toTimestamp(a.realEndTime));
    return onBudgetStreak(upToThisOne);
  }, [meetings, meeting]);
}
