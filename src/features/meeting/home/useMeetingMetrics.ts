import { useMemo } from 'react';
import { now } from '../../../common/services/datetime';
import { computeMeetingMetrics, type MeetingMetrics } from '../domain/metrics';
import { useMeetingStore } from '../store';

export type { MeetingMetrics };

/** Landing-page metrics derived live from the meetings already loaded in the store. */
export function useMeetingMetrics(): MeetingMetrics {
  const meetings = useMeetingStore((state) => state.meetings);
  return useMemo(() => computeMeetingMetrics(meetings, now()), [meetings]);
}
