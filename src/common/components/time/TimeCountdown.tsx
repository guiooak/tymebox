import { useEffect, useState } from 'react';
import {
  diffMs,
  formatDuration,
  formatLong,
  formatTime,
  isSameDay,
  type DateInput,
} from '../../services/datetime';
import type { Theme } from '../layout';
import { TimeDisplay } from './TimeDisplay';
import { TimeFormat, type TimeFormatSize } from './TimeFormat';

export type TimeCountdownProps = {
  /** Null/empty until the event has been scheduled — renders a soft placeholder. */
  timeTarget?: DateInput | null;
  timeFrom?: DateInput | null;
  disabled?: boolean;
  size?: TimeFormatSize;
  /** Once "now" passes this timestamp, warn (yellow) that the event is trending late. */
  warnAfter?: number | null;
  /** Footer copy shown while there's nothing to count down to. */
  unscheduledHint?: string;
};

export function TimeCountdown({
  timeTarget,
  timeFrom,
  disabled,
  size = 'xl',
  warnAfter,
  unscheduledHint = 'not scheduled yet',
}: TimeCountdownProps) {
  const [nowTs, setNowTs] = useState(() => Date.now());
  const scheduled = !!timeTarget;

  useEffect(() => {
    if (disabled || !scheduled) {
      return;
    }
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [disabled, scheduled]);

  if (!timeTarget) {
    return (
      <TimeDisplay
        theme="secondary"
        header="time left"
        footer={<small>{unscheduledHint}</small>}
      >
        <TimeFormat value="--:--" size={size} />
      </TimeDisplay>
    );
  }

  const remaining = diffMs(timeTarget, nowTs);
  const isNegative = remaining < 0;
  const behind = !disabled && warnAfter != null && nowTs >= warnAfter;

  const theme: Theme = disabled
    ? 'secondary'
    : isNegative
      ? 'danger'
      : behind
        ? 'warning'
        : 'primary';

  const endLabel =
    !timeFrom || isSameDay(timeFrom, timeTarget)
      ? formatTime(timeTarget)
      : formatLong(timeTarget);

  return (
    <TimeDisplay
      theme={theme}
      header={isNegative ? 'overdue time' : 'time left'}
      footer={<small>should be finished at {endLabel}</small>}
    >
      <TimeFormat
        value={disabled ? '--:--' : formatDuration(Math.abs(remaining))}
        size={size}
      />
    </TimeDisplay>
  );
}
