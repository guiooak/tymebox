import { tendencyCrossoverTs, type BurndownItem } from './burndown';
import { alertCrossings, alertState, alertThresholds } from './timeAlerts';

const MIN = 60_000;
const START = Date.UTC(2026, 9, 16, 9, 0);
const END = START + 60 * MIN;

const item = (id: string, weight: number, done = false): BurndownItem => ({
  id,
  title: id,
  weight,
  finishedAt: done ? new Date(START).toISOString() : null,
});

describe('tendencyCrossoverTs', () => {
  it('gives the first milestone its share of the time instead of warning at the start', () => {
    const items = [item('a', 1), item('b', 1), item('c', 1), item('d', 1)];
    expect(tendencyCrossoverTs(items, START, END)).toBe(START + 15 * MIN);
  });

  it('moves the threshold out as milestones are completed', () => {
    const items = [item('a', 1, true), item('b', 1), item('c', 1), item('d', 1)];
    expect(tendencyCrossoverTs(items, START, END)).toBe(START + 30 * MIN);
  });

  it('weighs the current milestone by its weight', () => {
    const items = [item('a', 3), item('b', 1)];
    expect(tendencyCrossoverTs(items, START, END)).toBe(START + 45 * MIN);
  });

  it('only warns at the end time when one milestone is left', () => {
    const items = [item('a', 1, true), item('b', 1)];
    expect(tendencyCrossoverTs(items, START, END)).toBe(END);
  });

  it('never warns when everything is done or the window is invalid', () => {
    expect(tendencyCrossoverTs([item('a', 1, true)], START, END)).toBeNull();
    expect(tendencyCrossoverTs([], START, END)).toBeNull();
    expect(tendencyCrossoverTs([item('a', 1)], END, START)).toBeNull();
  });
});

describe('alertThresholds', () => {
  it('is empty until the event has a schedule', () => {
    expect(
      alertThresholds({ goals: [], expectedStartTime: '', expectedEndTime: '' }),
    ).toEqual({ warnAfterTs: null, endTs: null });
  });

  it('warns once the current milestone runs past its share, and ends at the planned end', () => {
    const goal = (id: string, finishedAt = '') => ({
      id,
      name: id,
      weight: 1,
      finishedAt,
      decisions: '',
    });
    const start = new Date(START).toISOString();
    expect(
      alertThresholds({
        goals: [goal('a', start), goal('b'), goal('c')],
        expectedStartTime: start,
        expectedEndTime: new Date(END).toISOString(),
      }),
    ).toEqual({ warnAfterTs: START + 40 * MIN, endTs: END });
  });
});

describe('alertState', () => {
  const thresholds = { warnAfterTs: START + 15 * MIN, endTs: END };

  it('is on track before the threshold, late after it, overdue after the end', () => {
    expect(alertState(thresholds, START)).toEqual({ late: false, overdue: false });
    expect(alertState(thresholds, START + 20 * MIN)).toEqual({
      late: true,
      overdue: false,
    });
    expect(alertState(thresholds, END)).toEqual({ late: false, overdue: true });
  });
});

describe('alertCrossings', () => {
  const onTrack = { late: false, overdue: false };
  const late = { late: true, overdue: false };
  const overdue = { late: false, overdue: true };

  it('fires on the way into a state, once', () => {
    expect(alertCrossings(onTrack, late)).toEqual(['late']);
    expect(alertCrossings(late, late)).toEqual([]);
    expect(alertCrossings(late, overdue)).toEqual(['overdue']);
  });

  it('re-arms after the event gets back on track', () => {
    expect(alertCrossings(late, onTrack)).toEqual([]);
    expect(alertCrossings(onTrack, late)).toEqual(['late']);
  });

  it('reports a state already entered on the first check', () => {
    expect(alertCrossings(null, late)).toEqual(['late']);
    expect(alertCrossings(null, onTrack)).toEqual([]);
  });
});
