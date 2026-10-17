import { useEffect, useRef, useState } from 'react';
import { DatePicker, Icon, type IconName } from '../../../common/components';
import { useT } from '../../../common/services/i18n';
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
  const t = useT().board;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const editorRef = useRef<HTMLSpanElement>(null);

  const display = value
    ? isSameDay(value, new Date())
      ? formatTime(value)
      : formatLong(value)
    : t.notSet;

  const open = () => {
    setDraft(value);
    setEditing(true);
  };

  // Leaving the editor saves: the day grid and the time input are separate
  // picks, so the change is kept as a draft until focus moves elsewhere.
  // Escape throws the draft away.
  useEffect(() => {
    if (!editing) {
      return;
    }
    const finish = (save: boolean) => {
      setEditing(false);
      if (save && draft && draft !== value) {
        onChange(draft);
      }
    };
    const editor = editorRef.current;
    const onPointerDown = (event: MouseEvent) => {
      if (editor && !editor.contains(event.target as Node)) {
        finish(true);
      }
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (editor && next && !editor.contains(next)) {
        finish(true);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      } else if (
        event.key === 'Enter' &&
        (event.target as HTMLElement).tagName === 'INPUT'
      ) {
        event.preventDefault();
        finish(true);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    editor?.addEventListener('focusout', onFocusOut);
    editor?.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      editor?.removeEventListener('focusout', onFocusOut);
      editor?.removeEventListener('keydown', onKeyDown);
    };
  }, [editing, draft, value, onChange]);

  if (editing) {
    return (
      <span className={styles.chipEditor} ref={editorRef}>
        <DatePicker value={draft} onChange={setDraft} defaultOpen />
      </span>
    );
  }

  return (
    <button
      type="button"
      className={styles.chip}
      disabled={readOnly}
      aria-label={t.editNamed(label)}
      onClick={open}
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
  const t = useT().board;
  const duration =
    expectedStartTime && expectedEndTime ? diffMs(expectedEndTime, expectedStartTime) : 0;
  const invalid = !!expectedStartTime && !!expectedEndTime && duration <= 0;

  return (
    <div className={styles.schedule}>
      <ScheduleChip
        icon="clock"
        label={t.starts}
        value={expectedStartTime}
        onChange={(iso) => onChange({ expectedStartTime: iso })}
        readOnly={readOnly}
      />
      <ScheduleChip
        icon="flag"
        label={t.ends}
        value={expectedEndTime}
        onChange={(iso) => onChange({ expectedEndTime: iso })}
        readOnly={readOnly}
      />
      {duration > 0 && (
        <span className={styles.chipStatic}>{t.box(formatDuration(duration))}</span>
      )}
      {invalid && <span className={styles.scheduleError}>{t.endBeforeStart}</span>}
    </div>
  );
}
