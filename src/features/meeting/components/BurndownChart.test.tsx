import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LineChartProps } from '../../../common/services/chart';
import { renderWithApp } from '../../../test/render';

/*
 * The chart itself (Recharts) can't draw in jsdom, so the service's LineChart
 * is replaced by a stand-in that records what the burndown hands it.
 */

const drawn: LineChartProps[] = [];
vi.mock('../../../common/services/chart', () => ({
  LineChart: (props: LineChartProps) => {
    drawn.push(props);
    return <div data-testid="chart" />;
  },
}));

const { BurndownChart } = await import('./BurndownChart');

const START = '2026-01-01T10:00:00.000Z';
const END = '2026-01-01T11:00:00.000Z';
const items = [
  { id: 'a', title: 'One', weight: 1, finishedAt: '2026-01-01T10:20:00.000Z' },
  { id: 'b', title: 'Two', weight: 1, finishedAt: null },
];
const last = () => drawn[drawn.length - 1];

afterEach(() => {
  drawn.length = 0;
  vi.useRealTimers();
});

describe('BurndownChart', () => {
  it('draws the tendency and your progress across the event window', () => {
    renderWithApp(<BurndownChart startTime={START} endTime={END} items={items} />);
    expect(last().series.map((series) => [series.id, series.name])).toEqual([
      ['tendency', 'Tendency'],
      ['progress', 'Your progress'],
    ]);
    expect(last().xDomain).toEqual([Date.parse(START), Date.parse(END)]);
    expect(last().animationDuration).toBe(320);
    expect(last().xTickFormatter?.(Date.parse(START))).toMatch(/^\d\d:\d\d$/);
  });

  it('adds a projection while running, and keeps it moving', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:30:00.000Z'));
    renderWithApp(
      <BurndownChart startTime={START} endTime={END} items={items} showProjection />,
    );
    expect(last().series.map((series) => series.id)).toContain('projection');
    const before = drawn.length;
    act(() => vi.advanceTimersByTime(10_000));
    expect(drawn.length).toBeGreaterThan(before);
  });

  it('skips the projection once nothing is left to do', () => {
    renderWithApp(
      <BurndownChart
        startTime={START}
        endTime={END}
        items={[{ ...items[0] }]}
        showProjection
      />,
    );
    expect(last().series.map((series) => series.id)).not.toContain('projection');
  });

  it('turns animation off for people who prefer reduced motion', () => {
    renderWithApp(<BurndownChart startTime={START} endTime={END} items={items} />, {
      media: ['(prefers-reduced-motion: reduce)'],
    });
    expect(last().animationDuration).toBe(0);
  });

  it('shows a tooltip row per series, by point label or series name', () => {
    renderWithApp(<BurndownChart startTime={START} endTime={END} items={items} />);
    const tooltip = last().renderTooltip?.([
      { name: 'Your progress', color: '#00f', point: { x: 1, y: 1, label: 'One' } },
      { name: 'Tendency', color: '#999', point: { x: 1, y: null } },
    ]);
    render(<>{tooltip}</>);
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Tendency')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('explains itself from the info button', async () => {
    renderWithApp(<BurndownChart startTime={START} endTime={END} items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'More info' }));
    expect(
      await screen.findByRole('dialog', { name: 'This is your Burndown Chart 📉' }),
    ).toBeInTheDocument();
  });
});
