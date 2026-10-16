import { formatDuration, formatDurationMinutes } from './datetime';

const s = (seconds: number) => seconds * 1000;

describe('formatDurationMinutes', () => {
  it('rounds time still left up, so it never reads 00m before the end', () => {
    expect(formatDurationMinutes(s(59), 'up')).toBe('01m');
    expect(formatDurationMinutes(s(19 * 60 + 58), 'up')).toBe('20m');
    expect(formatDurationMinutes(s(20 * 60), 'up')).toBe('20m');
    expect(formatDurationMinutes(0, 'up')).toBe('00m');
  });

  it('rounds time already spent down', () => {
    expect(formatDurationMinutes(s(59), 'down')).toBe('00m');
    expect(formatDurationMinutes(s(3 * 60 + 12), 'down')).toBe('03m');
  });

  it('switches to hours at 60 minutes, including after rounding up', () => {
    expect(formatDurationMinutes(s(59 * 60 + 1), 'up')).toBe('1h 00m');
    expect(formatDurationMinutes(s(65 * 60), 'down')).toBe('1h 05m');
  });

  it('ignores the sign', () => {
    expect(formatDurationMinutes(-s(3 * 60 + 12), 'down')).toBe('03m');
  });
});

describe('formatDuration', () => {
  it('keeps seconds under an hour', () => {
    expect(formatDuration(s(19 * 60 + 58))).toBe('19m 58s');
    expect(formatDuration(s(65 * 60))).toBe('1h 05m');
  });
});
