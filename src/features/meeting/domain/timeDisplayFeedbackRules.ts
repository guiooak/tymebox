import type { Theme } from '../../../common/components';
import { getT } from '../../../common/services/i18n';

const ONE_MINUTE = 60 * 1000;
const FIVE_MINUTES = 5 * ONE_MINUTE;

export type TimeFeedback = {
  momentMessage: string;
  durationMessage: string;
  theme: Theme;
};

/** Map a signed time difference (ms) to a feedback band. */
export function getTimeDisplayFeedbackByDiff(diff: number): TimeFeedback {
  const t = getT().report.feedback;
  if (typeof diff !== 'number' || Number.isNaN(diff)) {
    return { momentMessage: '', durationMessage: '', theme: 'secondary' };
  }
  if (diff < FIVE_MINUTES * -1) {
    return { momentMessage: t.veryLate, durationMessage: t.wasted, theme: 'danger' };
  }
  if (diff < ONE_MINUTE * -1) {
    return { momentMessage: t.late, durationMessage: t.wasted, theme: 'warning' };
  }
  if (diff < 0) {
    return {
      momentMessage: t.littleLate,
      durationMessage: t.wasted,
      theme: 'warning',
    };
  }
  if (diff < ONE_MINUTE) {
    return {
      momentMessage: t.onTarget,
      durationMessage: t.onTarget,
      theme: 'success',
    };
  }
  return { momentMessage: t.advanced, durationMessage: t.saved, theme: 'success' };
}
