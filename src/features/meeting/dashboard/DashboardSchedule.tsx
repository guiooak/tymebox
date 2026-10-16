import { useState } from 'react';
import { Button, DatePicker, Icon, type IconName } from '../../../common/components';
import {
  diffMs,
  formatDuration,
  formatLong,
  formatTime,
  isSameDay,
} from '../../../common/services/datetime';
import styles from './MeetingDashboard.module.css';

export type DashboardScheduleProps = {
  expectedStartTime: string;
  expectedEndTime: string;
  onChange: (patch: { expectedStartTime?: string; expectedEndTime?: string }) => void;
  readOnly?: boolean;
};

type ChipProps = {
  icon: IconName;
  label: string;
  value: string;
  onChange: (iso: string) => void;
  readOnly?: boolean;
};

function ScheduleChip({ icon, label, value, onChange, readOnly }: ChipProps) {
  const [editing, setEditing] = useState(false);

  const display = value
    ? isSameDay(value, new Date())
      ? formatTime(value)
      : formatLong(value)
    : 'not set';

  // Stays open across picks: the day grid and the time input are separate
  // changes, so closing on the first one would mean reopening for the second.
  if (editing) {
    return (
      <span className={styles.chipEditor}>
        <DatePicker value={value} onChange={onChange} />
        <Button size="sm" onClick={() => setEditing(false)}>
          Done
        </Button>
      </span>
    );
  }

  return (
    <button
      type="button"
      className={styles.chip}
      disabled={readOnly}
      aria-label={`Edit ${label.toLowerCase()}`}
      onClick={() => setEditing(true)}
    >
      <Icon name={icon} size={16} className={styles.chipIcon} />
      <span className={styles.chipLabel}>{label}</span>
      <strong className={value ? undefined : styles.chipEmpty}>{display}</strong>
    </button>
  );
}

/**
 * Click-to-edit start/end chips. The schedule stays optional right up until the
 * event is started, so an unplanned event reads as "not set" rather than
 * blocking the board.
 */
export function DashboardSchedule({
  expectedStartTime,
  expectedEndTime,
  onChange,
  readOnly,
}: DashboardScheduleProps) {
  const duration =
    expectedStartTime && expectedEndTime ? diffMs(expectedEndTime, expectedStartTime) : 0;
  const invalid = !!expectedStartTime && !!expectedEndTime && duration <= 0;

  return (
    <div className={styles.schedule}>
      <ScheduleChip
        icon="clock"
        label="Starts"
        value={expectedStartTime}
        onChange={(iso) => onChange({ expectedStartTime: iso })}
        readOnly={readOnly}
      />
      <ScheduleChip
        icon="flag"
        label="Ends"
        value={expectedEndTime}
        onChange={(iso) => onChange({ expectedEndTime: iso })}
        readOnly={readOnly}
      />
      {duration > 0 && (
        <span className={styles.chipStatic}>{formatDuration(duration)} box</span>
      )}
      {invalid && (
        <span className={styles.scheduleError}>End time should be after start time</span>
      )}
    </div>
  );
}
