import {
  addHours as addHoursFn,
  differenceInMilliseconds,
  format,
  formatISO,
  isSameDay as isSameDayFn,
  parseISO,
} from 'date-fns';
import { enUS, ptBR, type Locale as DateLocale } from 'date-fns/locale';
import { getLocale, getT, type Locale } from '../i18n';
import type { DateInput, DurationParts } from './types';

const DATE_LOCALES: Record<Locale, DateLocale> = { 'en-US': enUS, 'pt-BR': ptBR };

/** date-fns locale for the active interface language. */
export function getDateLocale(): DateLocale {
  return DATE_LOCALES[getLocale()];
}

/** Coerce any accepted input into a native Date. */
export function toDate(input: DateInput): Date {
  if (input instanceof Date) {
    return input;
  }
  if (typeof input === 'number') {
    return new Date(input);
  }
  return parseISO(input);
}

export function isValid(input: DateInput): boolean {
  return !Number.isNaN(toDate(input).getTime());
}

/** ISO string with local offset (mirrors the legacy moment.toISOString(true)). */
export function toISO(input: DateInput): string {
  return formatISO(toDate(input));
}

export function toTimestamp(input: DateInput): number {
  return toDate(input).getTime();
}

export function now(): Date {
  return new Date();
}

export function nowISO(): string {
  return toISO(now());
}

export function addHours(input: DateInput, amount: number): Date {
  return addHoursFn(toDate(input), amount);
}

/** Signed difference `a - b` in milliseconds. */
export function diffMs(a: DateInput, b: DateInput): number {
  return differenceInMilliseconds(toDate(a), toDate(b));
}

export function isSameDay(a: DateInput, b: DateInput): boolean {
  return isSameDayFn(toDate(a), toDate(b));
}

/** Short clock, e.g. "14:05". */
export function formatTime(input: DateInput): string {
  return format(toDate(input), 'HH:mm');
}

/** Long form in the active language, e.g. "Monday, March 3rd 2026, 14:05h". */
export function formatLong(input: DateInput): string {
  return format(toDate(input), getT().formats.longDate, { locale: getDateLocale() });
}

/** Day label used on the burndown axis, e.g. "Mon, 3 Mar". */
export function formatDayLabel(input: DateInput): string {
  return format(toDate(input), getT().formats.dayLabel, { locale: getDateLocale() });
}

/** Break a millisecond span into clock parts, tracking sign. */
export function breakdownDuration(ms: number): DurationParts {
  const negative = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { negative, hours, minutes, seconds };
}

/** Format a duration span as "1h 05m" (or "05m 12s" under an hour). */
export function formatDuration(ms: number): string {
  const { hours, minutes, seconds } = breakdownDuration(ms);
  const pad = (value: number) => String(value).padStart(2, '0');
  if (hours > 0) {
    return `${hours}h ${pad(minutes)}m`;
  }
  return `${pad(minutes)}m ${pad(seconds)}s`;
}

/**
 * Format a duration without seconds, as "1h 05m" or "19m". The minutes are
 * rounded in the given direction: up for time still left (so it never reads
 * "00m" before the end), down for time already spent.
 */
export function formatDurationMinutes(ms: number, rounding: 'up' | 'down'): string {
  const totalSeconds = Math.abs(ms) / 1000;
  const totalMinutes =
    rounding === 'up' ? Math.ceil(totalSeconds / 60) : Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}h ${pad(minutes)}m` : `${pad(minutes)}m`;
}
