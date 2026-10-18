import type { Theme } from '../../../common/components';
import { diffMs, formatDuration, formatTime } from '../../../common/services/datetime';
import { getT } from '../../../common/services/i18n';
import type { Meeting } from '../domain/types';
import { getTimeDisplayFeedbackByDiff } from '../domain/timeDisplayFeedbackRules';

export type TimeCard = {
  label: string;
  /** "planned 10:30" */
  planned: string;
  actual: string;
  /** "Advanced by 02m 00s", or '' when there's nothing to say. */
  message: string;
  theme: Theme;
};

type Times = Pick<
  Meeting,
  'expectedStartTime' | 'expectedEndTime' | 'realStartTime' | 'realEndTime'
>;

/**
 * The report's three timing cards (start, end, total duration): planned vs
 * actual and the feedback band. Shared by the page and the e-mail copy.
 */
export function timeCards(meeting: Times): TimeCard[] {
  const t = getT().report;
  const expectedDuration = diffMs(meeting.expectedEndTime, meeting.expectedStartTime);
  const realDuration = diffMs(meeting.realEndTime, meeting.realStartTime);

  const card = (
    label: string,
    planned: string,
    actual: string,
    diff: number,
    kind: 'moment' | 'duration',
  ): TimeCard => {
    const feedback = getTimeDisplayFeedbackByDiff(diff);
    const text = kind === 'duration' ? feedback.durationMessage : feedback.momentMessage;
    return {
      label,
      planned: t.planned(planned),
      actual,
      message: text ? `${text} ${formatDuration(Math.abs(diff))}` : '',
      theme: feedback.theme,
    };
  };

  return [
    card(
      t.start,
      formatTime(meeting.expectedStartTime),
      formatTime(meeting.realStartTime),
      diffMs(meeting.expectedStartTime, meeting.realStartTime),
      'moment',
    ),
    card(
      t.end,
      formatTime(meeting.expectedEndTime),
      formatTime(meeting.realEndTime),
      diffMs(meeting.expectedEndTime, meeting.realEndTime),
      'moment',
    ),
    card(
      t.totalDuration,
      formatDuration(Math.abs(expectedDuration)),
      formatDuration(Math.abs(realDuration)),
      expectedDuration - realDuration,
      'duration',
    ),
  ];
}
