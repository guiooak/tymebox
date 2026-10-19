import type { Theme } from '../../../common/components';
import { getT } from '../../../common/services/i18n';
import {
  diffMs,
  formatDuration,
  isSameMonth,
  toTimestamp,
} from '../../../common/services/datetime';
import type { Meeting } from './types';

export type MeetingMetrics = {
  total: number;
  finished: number;
  thisMonth: number;
  /** Weighted share of goals completed across finished meetings (0..1), or null when there are no goals. */
  goalCompletion: number | null;
  /** Average of each finished event's real / planned duration (1 = on budget), events left open excluded; null without data. */
  budgetRatio: number | null;
  /** Total real time spent across finished meetings (events left open excluded), in ms. */
  totalSpentMs: number;
  /** How many of the most recent finished events ran at or under their budget. */
  onBudgetStreak: number;
  /** Most recent finished meetings, newest first (max 5). */
  recent: Meeting[];
  /** Unfinished meetings scheduled to start later, soonest first. */
  upcoming: Meeting[];
};

export const isFinishedMeeting = (meeting: Meeting): boolean =>
  meeting.status === 'finished' && !!meeting.realEndTime;

/**
 * An event that ran more than this many times its planned length was, in
 * practice, left open and finished hours or days later: its real duration says
 * nothing about the meeting, so the Home metrics ignore it.
 */
export const LEFT_OPEN_FACTOR = 3;

function durations(meeting: Meeting): { expected: number; real: number } {
  const expected = Math.abs(diffMs(meeting.expectedStartTime, meeting.expectedEndTime));
  const real = Math.abs(diffMs(meeting.realStartTime, meeting.realEndTime));
  return {
    expected: Number.isNaN(expected) ? 0 : expected,
    real: Number.isNaN(real) ? 0 : real,
  };
}

/** True when the event ran so far past its window that it was surely left open. */
export function wasLeftOpen(meeting: Meeting): boolean {
  const { expected, real } = durations(meeting);
  return expected > 0 && real > expected * LEFT_OPEN_FACTOR;
}

/** True when the event took no longer than the window it was given (null: not comparable, or left open). */
export function wasOnBudget(meeting: Meeting): boolean | null {
  const { expected, real } = durations(meeting);
  if (!expected || !real || wasLeftOpen(meeting)) {
    return null;
  }
  return real <= expected;
}

/**
 * Consecutive on-budget events counting back from the most recent one. Events
 * without a comparable window are skipped rather than breaking the streak.
 */
export function onBudgetStreak(finishedNewestFirst: Meeting[]): number {
  let streak = 0;
  for (const meeting of finishedNewestFirst) {
    const onBudget = wasOnBudget(meeting);
    if (onBudget === null) {
      continue;
    }
    if (!onBudget) {
      break;
    }
    streak += 1;
  }
  return streak;
}

export type MeetingSummary = {
  status: { label: string; theme: Theme };
  /** Real duration once finished, planned duration before that; '' when unknown. */
  durationLabel: string;
  /** Over/under-budget phrasing — null when the two windows aren't comparable. */
  outcome: { label: string; theme: Theme } | null;
  /** Timestamp to sort a mixed-status list by: whatever the event last did. */
  sortTs: number;
};

const STATUS_THEMES: Record<Meeting['status'], Theme> = {
  draft: 'secondary',
  active: 'success',
  cancelled: 'warning',
  finished: 'primary',
};

/** Row-level facts for the history list: status, how long it took, how it went. */
export function summarizeMeeting(meeting: Meeting): MeetingSummary {
  const t = getT().history;
  const expected = Math.abs(diffMs(meeting.expectedStartTime, meeting.expectedEndTime));
  const real = Math.abs(diffMs(meeting.realStartTime, meeting.realEndTime));
  const duration = real > 0 ? real : expected;

  let outcome: MeetingSummary['outcome'] = null;
  if (expected > 0 && real > 0) {
    const overrun = real - expected;
    const pct = Math.round((overrun / expected) * 100);
    outcome =
      pct > 0
        ? { label: t.overBudget(pct), theme: pct > 25 ? 'danger' : 'warning' }
        : {
            label: pct < 0 ? t.underBudget(Math.abs(pct)) : t.onBudget,
            theme: 'success',
          };
  }

  return {
    status: {
      label: t.status[meeting.status] ?? t.status.draft,
      theme: STATUS_THEMES[meeting.status] ?? STATUS_THEMES.draft,
    },
    durationLabel: duration > 0 ? formatDuration(duration) : '',
    outcome,
    sortTs: Math.max(
      toTimestamp(meeting.realEndTime || 0) || 0,
      toTimestamp(meeting.realStartTime || 0) || 0,
      toTimestamp(meeting.expectedStartTime || 0) || 0,
      toTimestamp(meeting.createdAt || 0) || 0,
    ),
  };
}

/** Landing-page metrics derived from the meetings already loaded in the store. */
export function computeMeetingMetrics(meetings: Meeting[], now: Date): MeetingMetrics {
  const finishedList = meetings.filter(isFinishedMeeting);

  let weightTotal = 0;
  let weightDone = 0;
  const ratios: number[] = [];
  let totalSpent = 0;

  for (const meeting of finishedList) {
    for (const goal of meeting.goals) {
      const weight = Number(goal.weight) || 1;
      weightTotal += weight;
      if (goal.finishedAt) {
        weightDone += weight;
      }
    }

    if (wasLeftOpen(meeting)) {
      continue;
    }
    const { expected, real } = durations(meeting);
    if (expected > 0 && real > 0) {
      ratios.push(real / expected);
    }
    if (real > 0) {
      totalSpent += real;
    }
  }

  const newestFirst = [...finishedList].sort(
    (a, b) => toTimestamp(b.realEndTime) - toTimestamp(a.realEndTime),
  );

  const nowTs = now.getTime();
  const upcoming = meetings
    .filter(
      (meeting) =>
        !meeting.realEndTime &&
        !meeting.realStartTime &&
        !!meeting.expectedStartTime &&
        toTimestamp(meeting.expectedStartTime) > nowTs,
    )
    .sort((a, b) => toTimestamp(a.expectedStartTime) - toTimestamp(b.expectedStartTime));

  return {
    total: meetings.length,
    finished: finishedList.length,
    thisMonth: finishedList.filter((meeting) => isSameMonth(meeting.realEndTime, now))
      .length,
    goalCompletion: weightTotal > 0 ? weightDone / weightTotal : null,
    budgetRatio: ratios.length
      ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length
      : null,
    totalSpentMs: totalSpent,
    onBudgetStreak: onBudgetStreak(newestFirst),
    recent: newestFirst.slice(0, 5),
    upcoming,
  };
}
