import { afterEach, describe, expect, it } from 'vitest';
import { useI18nStore } from '../i18n';
import {
  addMonths,
  formatMonthYear,
  hoursOf,
  isSameMonth,
  minutesOf,
  monthGrid,
  weekdayLabels,
  withDay,
  withTime,
} from './calendar';

afterEach(() => {
  useI18nStore.getState().setLocale('en-US');
});

describe('calendar helpers', () => {
  it('builds whole weeks around the month, Sunday to Saturday', () => {
    const grid = monthGrid(new Date(2026, 2, 15));
    expect(grid).toHaveLength(35);
    expect(grid[0]).toEqual(new Date(2026, 2, 1));
    expect(grid[0].getDay()).toBe(0);
    expect(grid.at(-1)?.getDay()).toBe(6);
  });

  it('moves between months and compares them', () => {
    expect(addMonths(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 28));
    expect(isSameMonth(new Date(2026, 2, 1), new Date(2026, 2, 31))).toBe(true);
    expect(isSameMonth(new Date(2026, 2, 1), new Date(2026, 3, 1))).toBe(false);
  });

  it('titles a month in the active language, capitalised', () => {
    expect(formatMonthYear(new Date(2026, 2, 1))).toBe('March 2026');
    useI18nStore.getState().setLocale('pt-BR');
    expect(formatMonthYear(new Date(2026, 2, 1))).toBe('Março 2026');
  });

  it('reads and sets the time of day, and moves a date to another day', () => {
    const base = new Date(2026, 2, 1, 14, 35);
    expect(hoursOf(base)).toBe(14);
    expect(minutesOf(base)).toBe(35);
    expect(withTime(base, 9, 5)).toEqual(new Date(2026, 2, 1, 9, 5));
    expect(withDay(base, new Date(2027, 6, 20, 1, 2))).toEqual(
      new Date(2027, 6, 20, 14, 35),
    );
  });

  it('labels the weekdays with two letters in the active language', () => {
    expect(weekdayLabels()).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);
    useI18nStore.getState().setLocale('pt-BR');
    expect(weekdayLabels()[0]).toBe('Do');
    expect(weekdayLabels()).toHaveLength(7);
  });
});
