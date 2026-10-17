import { useEffect, useRef, useState } from 'react';
import {
  addMonths,
  formatMonthYear,
  formatLong,
  hoursOf,
  isSameDay,
  isSameMonth,
  minutesOf,
  monthGrid,
  nowISO,
  toDate,
  toISO,
  weekdayLabels,
  withDay,
  withTime,
} from '../../services/datetime';
import { useT } from '../../services/i18n';
import { cx } from '../cx';
import styles from './DatePicker.module.css';

export type DatePickerProps = {
  value: string;
  onChange: (iso: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  id?: string;
  /** Start with the calendar open, e.g. when the picker replaces a chip on click. */
  defaultOpen?: boolean;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function DatePicker({
  value,
  onChange,
  onBlur,
  invalid,
  id,
  defaultOpen = false,
}: DatePickerProps) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);
  const [view, setView] = useState(() => (value ? toDate(value) : new Date()));
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = value ? toDate(value) : null;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, onBlur]);

  const commit = (next: Date) => onChange(toISO(next));

  const onPickDay = (day: Date) => {
    const base = selected ?? toDate(nowISO());
    commit(withDay(base, day));
  };

  const onTimeChange = (raw: string) => {
    const [h, m] = raw.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) {
      return;
    }
    const base = selected ?? new Date();
    commit(withTime(base, h, m));
  };

  const timeValue = selected
    ? `${pad(hoursOf(selected))}:${pad(minutesOf(selected))}`
    : '';

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <button
        type="button"
        id={id}
        className={cx(styles.trigger, invalid && styles.invalid)}
        onClick={() => setOpen((current) => !current)}
      >
        {selected ? formatLong(selected) : t.common.selectDateTime}
      </button>

      {open && (
        <div className={styles.popover}>
          <div className={styles.head}>
            <button
              type="button"
              className={styles.nav}
              aria-label={t.common.previousMonth}
              onClick={() => setView(addMonths(view, -1))}
            >
              ‹
            </button>
            <span className={styles.monthTitle}>{formatMonthYear(view)}</span>
            <button
              type="button"
              className={styles.nav}
              aria-label={t.common.nextMonth}
              onClick={() => setView(addMonths(view, 1))}
            >
              ›
            </button>
          </div>

          <div className={styles.weekdays}>
            {weekdayLabels().map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>

          <div className={styles.grid}>
            {monthGrid(view).map((day) => (
              <button
                type="button"
                key={day.toISOString()}
                className={cx(
                  styles.day,
                  !isSameMonth(day, view) && styles.muted,
                  selected && isSameDay(day, selected) && styles.selected,
                )}
                onClick={() => onPickDay(day)}
              >
                {day.getDate()}
              </button>
            ))}
          </div>

          <div className={styles.timeRow}>
            <label htmlFor={`${id ?? 'dp'}-time`}>{t.common.time}</label>
            <input
              id={`${id ?? 'dp'}-time`}
              type="time"
              value={timeValue}
              onChange={(event) => onTimeChange(event.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
