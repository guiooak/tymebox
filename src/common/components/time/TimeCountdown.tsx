import { useEffect, useRef, useState } from 'react';
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
  /** Hero treatment — used by the dashboard, where time left is the point. */
  prominent?: boolean;
};

export function TimeCountdown({
  timeTarget,
  timeFrom,
  disabled,
  size = 'xl',
  warnAfter,
  unscheduledHint = 'not scheduled yet',
  prominent,
}: TimeCountdownProps) {
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [pulseKey, setPulseKey] = useState(0);
  const previousTheme = useRef<Theme | null>(null);
  const scheduled = !!timeTarget;

  useEffect(() => {
    if (disabled || !scheduled) {
      return;
    }
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [disabled, scheduled]);

  const remaining = timeTarget ? diffMs(timeTarget, nowTs) : 0;
  const isNegative = remaining < 0;
  const behind = !disabled && warnAfter != null && nowTs >= warnAfter;

  const theme: Theme = !timeTarget
    ? 'secondary'
    : disabled
      ? 'secondary'
      : isNegative
        ? 'danger'
        : behind
          ? 'warning'
          : 'primary';

  // Crossing into "running late" or "overdue" is the moment that matters, and
  // a colour swap alone is easy to miss when you glance back at the tab.
  useEffect(() => {
    const previous = previousTheme.current;
    previousTheme.current = theme;
    if (previous && previous !== theme && (theme === 'warning' || theme === 'danger')) {
      setPulseKey((value) => value + 1);
    }
  }, [theme]);

  if (!timeTarget) {
    return (
      <TimeDisplay
        theme="secondary"
        header="time left"
        footer={<small>{unscheduledHint}</small>}
        prominent={prominent}
      >
        <TimeFormat value="--:--" size={size} />
      </TimeDisplay>
    );
  }

  const endLabel =
    !timeFrom || isSameDay(timeFrom, timeTarget)
      ? formatTime(timeTarget)
      : formatLong(timeTarget);

  return (
    <TimeDisplay
      theme={theme}
      header={isNegative ? 'overdue time' : 'time left'}
      footer={<small>should be finished at {endLabel}</small>}
      prominent={prominent}
      pulseKey={pulseKey}
    >
      <TimeFormat
        value={disabled ? '--:--' : formatDuration(Math.abs(remaining))}
        size={size}
      />
    </TimeDisplay>
  );
}
