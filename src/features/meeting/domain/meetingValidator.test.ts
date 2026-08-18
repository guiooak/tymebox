import { describe, expect, it } from 'vitest';
import { isValidMeeting } from './meetingValidator';
import { createGoal } from './types';

const base = {
  id: 'm1',
  name: 'Weekly planning',
  goals: [createGoal('Agree on scope')],
};

describe('isValidMeeting', () => {
  it('accepts a draft with no schedule and no goals', () => {
    expect(isValidMeeting({ id: 'm1', name: 'Weekly planning', goals: [] })).toBe(true);
  });

  it('accepts a fully scheduled meeting', () => {
    expect(
      isValidMeeting({
        ...base,
        expectedStartTime: '2026-08-01T09:00:00Z',
        expectedEndTime: '2026-08-01T10:00:00Z',
      }),
    ).toBe(true);
  });

  it('rejects missing core fields and malformed goals', () => {
    expect(isValidMeeting(null)).toBe(false);
    expect(isValidMeeting({ ...base, name: '' })).toBe(false);
    expect(isValidMeeting({ ...base, id: '' })).toBe(false);
    expect(isValidMeeting({ ...base, goals: [{ ...createGoal('x'), name: '' }] })).toBe(
      false,
    );
  });
});
