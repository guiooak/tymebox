import { describe, expect, it } from 'vitest';
import {
  createGoal,
  createSideTopic,
  duplicateGoal,
  hasSchedule,
  moveItem,
  resetGoalsProgress,
} from './types';

describe('hasSchedule', () => {
  it('needs both ends of the window', () => {
    expect(hasSchedule({ expectedStartTime: 'a', expectedEndTime: 'b' })).toBe(true);
    expect(hasSchedule({ expectedStartTime: 'a', expectedEndTime: '' })).toBe(false);
    expect(hasSchedule({ expectedStartTime: '', expectedEndTime: 'b' })).toBe(false);
    expect(hasSchedule({ expectedStartTime: '', expectedEndTime: '' })).toBe(false);
  });
});

describe('moveItem', () => {
  it('moves an item forwards and backwards', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('is a no-op for same or out-of-range indexes', () => {
    const items = ['a', 'b', 'c'];
    expect(moveItem(items, 1, 1)).toBe(items);
    expect(moveItem(items, -1, 1)).toBe(items);
    expect(moveItem(items, 0, 3)).toBe(items);
  });
});

describe('duplicateGoal', () => {
  it('copies name and weight but resets progress', () => {
    const goal = { ...createGoal('Ship it', 3), finishedAt: 'now', decisions: 'notes' };
    const copy = duplicateGoal(goal);

    expect(copy.name).toBe('Ship it');
    expect(copy.weight).toBe(3);
    expect(copy.finishedAt).toBe('');
    expect(copy.decisions).toBe('');
    expect(copy.id).not.toBe(goal.id);
  });
});

describe('createSideTopic', () => {
  it('records the milestone it was parked during', () => {
    expect(createSideTopic('Discovery').goalName).toBe('Discovery');
    expect(createSideTopic().goalName).toBe('');
  });
});

describe('resetGoalsProgress', () => {
  it('clears completions but keeps names, weights and notes', () => {
    const goal = {
      ...createGoal('Plan', 2),
      finishedAt: '2026-01-01T10:00:00Z',
      decisions: 'ok',
    };
    expect(resetGoalsProgress([goal])).toEqual([{ ...goal, finishedAt: '' }]);
  });
});
