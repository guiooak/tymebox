import { toTimestamp } from '../../../common/services/datetime';
import type { ChartPoint } from '../../../common/services/chart';

export type BurndownItem = {
  id: string;
  title: string;
  weight: number;
  finishedAt: string | null;
};

export function getTotalWeight(items: BurndownItem[]): number {
  return items.reduce((acc, item) => acc + (Number(item.weight) || 1), 0);
}

/** Straight reference line from total weight down to zero across the event window. */
export function buildTendency(
  startTs: number,
  endTs: number,
  total: number,
): ChartPoint[] {
  return [
    { x: startTs, y: total, label: 'Start' },
    { x: endTs, y: 0, label: 'Deadline' },
  ];
}

/**
 * Timestamp after which the event is trending late: the moment the tendency
 * line drops to the weight that will be left once the *current* milestone (the
 * first unfinished one) is done. Before that the current milestone is still
 * within its share of the time.
 *
 * Measuring against the current milestone rather than all remaining work
 * matters at the start: with nothing done yet, all remaining work equals the
 * total, so the event would count as late from its first second.
 *
 * Returns null when it never happens (nothing left to do, no work, or an
 * invalid window). With one milestone left this is the end time itself.
 */
export function tendencyCrossoverTs(
  items: BurndownItem[],
  startTs: number,
  endTs: number,
): number | null {
  const total = getTotalWeight(items);
  const unfinished = items.filter((item) => !item.finishedAt);
  if (total <= 0 || unfinished.length === 0 || endTs <= startTs) {
    return null;
  }
  const afterCurrent = unfinished
    .slice(1)
    .reduce((acc, item) => acc + (Number(item.weight) || 1), 0);
  return endTs - (afterCurrent / total) * (endTs - startTs);
}

/** Step-down line: one point per completed goal at its finish time. */
export function buildProgress(
  items: BurndownItem[],
  startTs: number,
  total: number,
): ChartPoint[] {
  const finished = items
    .filter((item) => item.finishedAt)
    .sort(
      (a, b) => toTimestamp(a.finishedAt as string) - toTimestamp(b.finishedAt as string),
    );

  const points: ChartPoint[] = [{ x: startTs, y: total, label: 'No task done yet' }];
  let remaining = total;
  for (const item of finished) {
    remaining -= Number(item.weight) || 1;
    points.push({
      x: toTimestamp(item.finishedAt as string),
      y: remaining,
      label: item.title,
    });
  }
  return points;
}

/** Projection of the next completion based on the average remaining goal weight. */
export function buildProjection(
  items: BurndownItem[],
  lastProgress: ChartPoint,
  nowTs: number,
): ChartPoint[] | null {
  if (lastProgress.y === 0 || lastProgress.y === null) {
    return null;
  }
  const remainingWeights = items
    .filter((item) => !item.finishedAt)
    .map((item) => Number(item.weight) || 1);
  if (remainingWeights.length === 0) {
    return null;
  }
  const avg =
    remainingWeights.reduce((acc, weight) => acc + weight, 0) / remainingWeights.length;
  return [
    { x: lastProgress.x, y: lastProgress.y, label: 'Last done' },
    { x: nowTs, y: Math.max(0, lastProgress.y - avg), label: 'Next target' },
  ];
}
