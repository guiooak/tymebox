import { describe, expect, it, vi } from 'vitest';
import { printPage, toFileStem } from './download';

describe('toFileStem', () => {
  it('slugifies a title', () => {
    expect(toFileStem('Weekly Planning — Q3!')).toBe('weekly-planning-q3');
    expect(toFileStem('  spaced  out  ')).toBe('spaced-out');
  });

  it('falls back when nothing usable is left', () => {
    expect(toFileStem('———')).toBe('timebox-report');
    expect(toFileStem('', 'fallback')).toBe('fallback');
  });
});

describe('printPage', () => {
  it('opens the browser’s print dialog', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    printPage();
    expect(print).toHaveBeenCalled();
  });
});
