import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeCountdown } from './TimeCountdown';

const START = Date.parse('2026-01-01T10:00:00.000Z');
const at = (minutes: number) => new Date(START + minutes * 60_000).toISOString();
const display = (container: HTMLElement) => container.firstElementChild as HTMLElement;
const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TimeCountdown', () => {
  it('shows a placeholder until the event is scheduled', () => {
    const { rerender } = render(<TimeCountdown />);
    expect(screen.getByText('--:--')).toBeInTheDocument();
    expect(screen.getByText('not scheduled yet')).toBeInTheDocument();
    rerender(<TimeCountdown unscheduledHint="Set a time" />);
    expect(screen.getByText('Set a time')).toBeInTheDocument();
  });

  it('counts down, warns when trending late and pulses into overdue', () => {
    const { container } = render(
      <TimeCountdown timeFrom={at(0)} timeTarget={at(1)} warnAfter={START + 30_000} />,
    );
    expect(screen.getByText('time left')).toBeInTheDocument();
    expect(screen.getByText(/^should be finished at \d\d:\d\d$/)).toBeInTheDocument();
    expect(display(container).className).toMatch(/primary/);
    expect(container.querySelector('[class*="pulse"]')).toBeNull();

    tick(31_000);
    expect(display(container).className).toMatch(/warning/);
    expect(container.querySelector('[class*="pulse"]')).not.toBeNull();

    tick(30_000);
    expect(screen.getByText('overdue time')).toBeInTheDocument();
    expect(display(container).className).toMatch(/danger/);
  });

  it('shows whole minutes when seconds are hidden, early or overdue', () => {
    const { rerender } = render(
      <TimeCountdown timeTarget={at(10)} showSeconds={false} />,
    );
    expect(screen.getByText('10m')).toBeInTheDocument();
    rerender(<TimeCountdown timeTarget={at(-10)} showSeconds={false} />);
    expect(screen.getByText('10m')).toBeInTheDocument();
    expect(screen.getByText('overdue time')).toBeInTheDocument();
  });

  it('stands still and grey while disabled, with the date when it ends another day', () => {
    const { container } = render(
      <TimeCountdown
        timeFrom={at(0)}
        timeTarget={at(60 * 30)}
        disabled
        warnAfter={START}
      />,
    );
    expect(screen.getByText('--:--')).toBeInTheDocument();
    expect(display(container).className).toMatch(/secondary/);
    expect(
      screen.getByText(/^should be finished at .*\d{4}|^should be finished at \D/),
    ).toBeInTheDocument();
    tick(5000);
    expect(screen.getByText('--:--')).toBeInTheDocument();
  });

  it('shows only the end time when there is no start', () => {
    render(<TimeCountdown timeTarget={at(30)} />);
    expect(screen.getByText(/^should be finished at \d\d:\d\d$/)).toBeInTheDocument();
  });
});
