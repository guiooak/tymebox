import { describe, expect, it } from 'vitest';
import { getTimeDisplayFeedbackByDiff } from './timeDisplayFeedbackRules';

const MIN = 60_000;

describe('getTimeDisplayFeedbackByDiff', () => {
  it('maps how far off the plan you were to a message and a colour', () => {
    expect(getTimeDisplayFeedbackByDiff(-6 * MIN)).toEqual({
      momentMessage: 'Very late by',
      durationMessage: 'Wasted',
      theme: 'danger',
    });
    expect(getTimeDisplayFeedbackByDiff(-2 * MIN)).toEqual({
      momentMessage: 'Late by',
      durationMessage: 'Wasted',
      theme: 'warning',
    });
    expect(getTimeDisplayFeedbackByDiff(-30_000)).toEqual({
      momentMessage: 'A little late by',
      durationMessage: 'Wasted',
      theme: 'warning',
    });
    expect(getTimeDisplayFeedbackByDiff(30_000)).toEqual({
      momentMessage: 'On target! Left just',
      durationMessage: 'On target! Left just',
      theme: 'success',
    });
    expect(getTimeDisplayFeedbackByDiff(10 * MIN)).toEqual({
      momentMessage: 'Advanced by',
      durationMessage: 'Saved',
      theme: 'success',
    });
  });

  it('says nothing for a difference it can’t measure', () => {
    const empty = { momentMessage: '', durationMessage: '', theme: 'secondary' };
    expect(getTimeDisplayFeedbackByDiff(NaN)).toEqual(empty);
    expect(getTimeDisplayFeedbackByDiff('soon' as unknown as number)).toEqual(empty);
  });
});
