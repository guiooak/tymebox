import { describe, expect, it } from 'vitest';
import { toFileStem } from './download';

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
