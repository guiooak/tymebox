import { describe, expect, it } from 'vitest';
import {
  computeMeetingMetrics,
  onBudgetStreak,
  summarizeMeeting,
  wasLeftOpen,
  wasOnBudget,
} from './metrics';
import type { Meeting } from './types';

const meeting = (over: Partial<Meeting>): Meeting => ({
  id: 'm',
  owner: 'u1',
  ownerName: 'Ana',
  name: 'Event',
  description: '',
  expectedStartTime: '',
  expectedEndTime: '',
  realStartTime: '',
  realEndTime: '',
  goals: [],
  sideTopics: [],
  status: 'draft',
  createdAt: '',
  updatedAt: '',
  ...over,
});

/** A finished event whose real duration is `realMinutes` against a 60m budget. */
const finished = (id: string, day: number, realMinutes: number): Meeting =>
  meeting({
    id,
    status: 'finished',
    expectedStartTime: `2026-08-${String(day).padStart(2, '0')}T09:00:00.000Z`,
    expectedEndTime: `2026-08-${String(day).padStart(2, '0')}T10:00:00.000Z`,
    realStartTime: `2026-08-${String(day).padStart(2, '0')}T09:00:00.000Z`,
    realEndTime: new Date(
      Date.parse(`2026-08-${String(day).padStart(2, '0')}T09:00:00.000Z`) +
        realMinutes * 60_000,
    ).toISOString(),
  });

describe('wasOnBudget', () => {
  it('compares real against expected duration', () => {
    expect(wasOnBudget(finished('a', 1, 45))).toBe(true);
    expect(wasOnBudget(finished('a', 1, 60))).toBe(true);
    expect(wasOnBudget(finished('a', 1, 75))).toBe(false);
  });

  it('returns null without a comparable window', () => {
    expect(wasOnBudget(meeting({ status: 'finished' }))).toBeNull();
  });
});

describe('onBudgetStreak', () => {
  it('counts back from the newest until an overrun', () => {
    expect(
      onBudgetStreak([finished('a', 3, 50), finished('b', 2, 55), finished('c', 1, 90)]),
    ).toBe(2);
  });

  it('skips events with no comparable window instead of breaking', () => {
    expect(
      onBudgetStreak([
        finished('a', 3, 50),
        meeting({ status: 'finished' }),
        finished('c', 1, 55),
      ]),
    ).toBe(2);
  });

  it('is zero when the most recent event ran over', () => {
    expect(onBudgetStreak([finished('a', 3, 90), finished('b', 2, 50)])).toBe(0);
  });
});

describe('summarizeMeeting', () => {
  it('labels an over-budget finished event', () => {
    const summary = summarizeMeeting(finished('a', 1, 90));

    expect(summary.status.label).toBe('Finished');
    expect(summary.durationLabel).toBe('1h 30m');
    expect(summary.outcome).toEqual({ label: '50% over budget', theme: 'danger' });
  });

  it('labels an under-budget finished event', () => {
    expect(summarizeMeeting(finished('a', 1, 30)).outcome).toEqual({
      label: '50% under budget',
      theme: 'success',
    });
  });

  it('has no outcome for an event that never ran, and falls back to planned duration', () => {
    const draft = meeting({
      expectedStartTime: '2026-08-01T09:00:00.000Z',
      expectedEndTime: '2026-08-01T09:45:00.000Z',
    });
    const summary = summarizeMeeting(draft);

    expect(summary.outcome).toBeNull();
    expect(summary.status.label).toBe('Draft');
    expect(summary.durationLabel).toBe('45m 00s');
  });

  it('sorts by the latest thing the event did', () => {
    const draft = meeting({ createdAt: '2026-08-01T09:00:00.000Z' });
    const done = finished('a', 3, 50);

    expect(summarizeMeeting(done).sortTs).toBeGreaterThan(summarizeMeeting(draft).sortTs);
  });
});

describe('computeMeetingMetrics', () => {
  const now = new Date('2026-08-05T12:00:00.000Z');

  it('lists only future, unstarted events as upcoming, soonest first', () => {
    const later = meeting({ id: 'later', expectedStartTime: '2026-08-09T09:00:00.000Z' });
    const sooner = meeting({
      id: 'sooner',
      expectedStartTime: '2026-08-06T09:00:00.000Z',
    });
    const past = meeting({ id: 'past', expectedStartTime: '2026-08-01T09:00:00.000Z' });
    const running = meeting({
      id: 'running',
      expectedStartTime: '2026-08-09T09:00:00.000Z',
      realStartTime: '2026-08-05T09:00:00.000Z',
    });

    const metrics = computeMeetingMetrics([later, sooner, past, running], now);

    expect(metrics.upcoming.map((item) => item.id)).toEqual(['sooner', 'later']);
  });

  it('caps recent at five, newest first', () => {
    const list = [1, 2, 3, 4, 5, 6].map((day) => finished(`m${day}`, day, 50));
    const metrics = computeMeetingMetrics(list, now);

    expect(metrics.recent).toHaveLength(5);
    expect(metrics.recent[0].id).toBe('m6');
  });

  it('weights goal completion and tracks the streak', () => {
    const withGoals = meeting({
      ...finished('g', 4, 50),
      goals: [
        { id: '1', name: 'a', weight: 3, finishedAt: 'x', decisions: '' },
        { id: '2', name: 'b', weight: 1, finishedAt: '', decisions: '' },
      ],
    });

    const metrics = computeMeetingMetrics([withGoals], now);

    expect(metrics.goalCompletion).toBe(0.75);
    expect(metrics.onBudgetStreak).toBe(1);
    expect(metrics.finished).toBe(1);
  });
});

describe('events left open', () => {
  const now = new Date('2026-08-20T12:00:00.000Z');

  it('spots an event that ran past three times its plan', () => {
    expect(wasLeftOpen(finished('a', 1, 180))).toBe(false);
    expect(wasLeftOpen(finished('a', 1, 181))).toBe(true);
    expect(wasOnBudget(finished('a', 1, 6000))).toBeNull();
  });

  it('averages time vs budget per event, leaving out events left open', () => {
    // 60m and 90m against 60m plans: +0% and +50%, so +25% on average. The
    // 100-hour one was forgotten open and doesn't count.
    const metrics = computeMeetingMetrics(
      [finished('a', 1, 60), finished('b', 2, 90), finished('c', 3, 6000)],
      now,
    );
    expect(metrics.budgetRatio).toBeCloseTo(1.25);
    expect(metrics.totalSpentMs).toBe(150 * 60_000);
  });

  it('weighs a short event as much as a long one', () => {
    const short = meeting({
      id: 's',
      status: 'finished',
      expectedStartTime: '2026-08-05T09:00:00.000Z',
      expectedEndTime: '2026-08-05T09:10:00.000Z',
      realStartTime: '2026-08-05T09:00:00.000Z',
      realEndTime: '2026-08-05T09:20:00.000Z',
    });
    // 10m planned, 20m real (2×) next to a 60m event on time (1×): 1.5 on average,
    // where summing durations would have said 80/70.
    const metrics = computeMeetingMetrics([short, finished('a', 1, 60)], now);
    expect(metrics.budgetRatio).toBeCloseTo(1.5);
  });

  it('skips events left open in the on-budget streak instead of breaking it', () => {
    expect(
      onBudgetStreak([
        finished('c', 3, 6000),
        finished('b', 2, 50),
        finished('a', 1, 55),
      ]),
    ).toBe(2);
  });
});
