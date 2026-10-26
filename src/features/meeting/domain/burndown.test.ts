import { describe, expect, it } from 'vitest';
import {
  buildProgress,
  buildProjection,
  buildTendency,
  getTotalWeight,
  tendencyCrossoverTs,
  type BurndownItem,
} from './burndown';

const item = (over: Partial<BurndownItem> = {}): BurndownItem => ({
  id: 'a',
  title: 'A',
  weight: 1,
  finishedAt: null,
  ...over,
});

describe('getTotalWeight', () => {
  it('adds the weights, counting a missing or zero weight as 1', () => {
    expect(
      getTotalWeight([item({ weight: 2 }), item({ weight: 0 }), item({ weight: NaN })]),
    ).toBe(4);
    expect(getTotalWeight([])).toBe(0);
  });
});

describe('buildTendency', () => {
  it('draws a straight line from the total at the start to zero at the deadline', () => {
    expect(buildTendency(100, 200, 6)).toEqual([
      { x: 100, y: 6, label: 'Start' },
      { x: 200, y: 0, label: 'Deadline' },
    ]);
  });
});

describe('buildProgress', () => {
  it('steps down at each completion, in time order, labelled by milestone', () => {
    const items = [
      item({ id: 'late', title: 'Late', weight: 2, finishedAt: '2026-01-01T10:40:00Z' }),
      item({ id: 'open', title: 'Open' }),
      item({
        id: 'early',
        title: 'Early',
        weight: 0,
        finishedAt: '2026-01-01T10:10:00Z',
      }),
    ];
    expect(buildProgress(items, 0, 4)).toEqual([
      { x: 0, y: 4, label: 'No task done yet' },
      { x: Date.parse('2026-01-01T10:10:00Z'), y: 3, label: 'Early' },
      { x: Date.parse('2026-01-01T10:40:00Z'), y: 1, label: 'Late' },
    ]);
  });
});

describe('tendencyCrossoverTs', () => {
  it('is when the tendency reaches what is left after the current milestone', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c', weight: 2 })];
    // 4 in total; after the current one, 3 are left: 1/4 of the window in.
    expect(tendencyCrossoverTs(items, 0, 400)).toBe(100);
  });

  it('is the deadline itself with one milestone left', () => {
    const items = [item({ finishedAt: '2026-01-01T10:10:00Z' }), item({ id: 'b' })];
    expect(tendencyCrossoverTs(items, 0, 400)).toBe(400);
  });

  it('never happens with nothing left, no work, or a window that ends first', () => {
    expect(tendencyCrossoverTs([item({ finishedAt: 'x' })], 0, 400)).toBeNull();
    expect(tendencyCrossoverTs([], 0, 400)).toBeNull();
    expect(tendencyCrossoverTs([item()], 400, 400)).toBeNull();
  });

  it('counts missing weights as 1', () => {
    const items = [item({ id: 'a' }), item({ id: 'b', weight: 0 })];
    expect(tendencyCrossoverTs(items, 0, 200)).toBe(100);
  });
});

describe('buildProjection', () => {
  const last = { x: 50, y: 3, label: 'X' };

  it('projects the next completion by the average weight still open', () => {
    const items = [item({ weight: 1 }), item({ weight: 3 }), item({ finishedAt: 'x' })];
    expect(buildProjection(items, last, 90)).toEqual([
      { x: 50, y: 3, label: 'Last done' },
      { x: 90, y: 1, label: 'Next target' },
    ]);
  });

  it('never goes below zero', () => {
    expect(
      buildProjection([item({ weight: 0 }), item({ weight: 9 })], last, 90)?.[1].y,
    ).toBe(0);
  });

  it('has nothing to project when done, unknown, or nothing is open', () => {
    expect(buildProjection([item()], { x: 1, y: 0 }, 9)).toBeNull();
    expect(buildProjection([item()], { x: 1, y: null }, 9)).toBeNull();
    expect(buildProjection([item({ finishedAt: 'x' })], last, 9)).toBeNull();
  });
});
