import { act, fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LineChartProps } from '../../../common/services/chart';
import {
  makeFinishedMeeting,
  makeGoal,
  makeLiveMeeting,
  makeMember,
  makeSideTopic,
  makeViewer,
} from '../../../test/fixtures';
import { renderWithApp } from '../../../test/render';
import type { Role } from '../domain/access';
import type { Meeting } from '../domain/types';

/*
 * The report of a finished event, with the store primed. The chart drawing and
 * image export are replaced (jsdom can't draw); printing is a spy.
 */

const chart = vi.hoisted(() => ({
  heights: [] as Array<number | undefined>,
  svg: null as SVGSVGElement | null,
  toPng: vi.fn(async () => 'data:image/png;base64,CHART'),
}));

vi.mock('../../../common/services/chart', () => ({
  LineChart: (props: LineChartProps) => {
    chart.heights.push(props.height);
    return <div data-testid="chart" />;
  },
  findChartSvg: () => chart.svg,
  svgElementToPngDataUrl: chart.toPng,
}));

const theme = vi.hoisted(() => ({ lightBg: '' }));
vi.mock('../../../common/services/theme', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../../common/services/theme')>();
  return {
    ...original,
    readCssVarsInTheme: (names: Record<string, string>) => ({
      ...Object.fromEntries(Object.keys(names).map((key) => [key, `light-${key}`])),
      bg: theme.lightBg,
    }),
  };
});

vi.mock('../../../common/services/download', () => ({ printPage: vi.fn() }));

const { printPage } = await import('../../../common/services/download');
const { MeetingReport } = await import('./MeetingReport');

beforeEach(() => {
  chart.heights.length = 0;
  chart.svg = null;
  chart.toPng.mockClear();
  theme.lightBg = '';
});

function report(
  event: Meeting,
  role: Role = 'owner',
  extra: Parameters<typeof renderWithApp>[1] = {},
) {
  const backToDashboard = vi.fn(async () => {});
  const view = renderWithApp(<MeetingReport />, {
    route: `/events/${event.id}/report`,
    path: '/events/:id/report',
    ...extra,
    store: {
      openEvent: () => () => {},
      backToDashboard,
      user: makeViewer(),
      openId: event.id,
      eventView: 'ready',
      event,
      role,
      ...extra.store,
    },
  });
  return { ...view, backToDashboard };
}

describe('MeetingReport', () => {
  it('sends an event that hasn’t finished back to its board', () => {
    const { path } = report(makeLiveMeeting());
    expect(path()).toBe('/events/m1');
  });

  it('tells when it happened, on one day or across two', () => {
    const { unmount } = report(makeFinishedMeeting());
    expect(
      screen.getByRole('heading', { name: /^Happened on .* until \d\d:\d\d$/ }),
    ).toBeInTheDocument();
    unmount();

    report(
      makeFinishedMeeting({
        realStartTime: '2026-01-01T22:00:00.000Z',
        realEndTime: '2026-01-03T01:00:00.000Z',
      }),
    );
    expect(screen.getByRole('heading', { name: /^Started / })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Finished / })).toBeInTheDocument();
  });

  it('lists the goals with when they were done, their notes and weights when they vary', () => {
    report(
      makeFinishedMeeting({
        description: 'Sprint 12',
        goals: [
          makeGoal({
            id: 'a',
            name: 'One',
            weight: 2,
            finishedAt: '2026-01-01T10:20:00.000Z',
            decisions: 'Ship it',
          }),
          makeGoal({ id: 'b', name: 'Two' }),
        ],
      }),
    );
    expect(screen.getByText('Sprint 12')).toBeInTheDocument();
    expect(screen.getByText(/done at \d\d:\d\dh · weight 2/)).toBeInTheDocument();
    expect(screen.getByText('not done · weight 1')).toBeInTheDocument();
    expect(screen.getByText('Ship it')).toBeInTheDocument();
  });

  it('lists the side topics that were written, tagged by milestone', () => {
    report(
      makeFinishedMeeting({
        sideTopics: [
          makeSideTopic({ id: 't1', value: 'Budget', goalName: 'Review last week' }),
          makeSideTopic({ id: 't2', value: 'Hiring', goalName: '' }),
          makeSideTopic({ id: 't3', value: '   ' }),
        ],
      }),
    );
    const list = screen.getByRole('heading', { name: 'Side topics' })
      .nextElementSibling as HTMLElement;
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('— during “Review last week”')).toBeInTheDocument();
  });

  it('leaves out side topics when there are none, and shows the timing cards', () => {
    report(makeFinishedMeeting());
    expect(screen.queryByRole('heading', { name: 'Side topics' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Timing' })).toBeInTheDocument();
    expect(screen.getByText('Total duration')).toBeInTheDocument();
  });

  it('shows the owner’s on-budget streak', () => {
    const earlier = makeFinishedMeeting({
      id: 'e',
      realStartTime: '2025-12-01T10:00:00.000Z',
      realEndTime: '2025-12-01T10:50:00.000Z',
      expectedStartTime: '2025-12-01T10:00:00.000Z',
      expectedEndTime: '2025-12-01T11:00:00.000Z',
    });
    const event = makeFinishedMeeting();
    const { unmount } = report(event, 'owner', { store: { meetings: [earlier, event] } });
    expect(
      screen.getByText('🔥 2nd event in a row finishing on budget'),
    ).toBeInTheDocument();
    unmount();

    report(event, 'contributor', { store: { meetings: [earlier, event] } });
    expect(screen.queryByText(/in a row/)).toBeNull();
  });

  it('draws a shorter chart on phones', () => {
    report(makeFinishedMeeting(), 'owner', { viewport: 'phone' });
    expect(chart.heights.at(-1)).toBe(220);
  });

  it('reopens the event for whoever can run it, or offers Home', async () => {
    const { backToDashboard, path, unmount } = report(makeFinishedMeeting());
    fireEvent.click(screen.getByRole('button', { name: 'Reopen event' }));
    await act(async () => {});
    expect(backToDashboard).toHaveBeenCalled();
    expect(path()).toBe('/events/m1');
    unmount();

    const viewer = report(makeFinishedMeeting(), 'viewer');
    fireEvent.click(screen.getByRole('button', { name: 'Go to Home' }));
    expect(viewer.path()).toBe('/');
  });

  it('prints', () => {
    report(makeFinishedMeeting());
    fireEvent.click(screen.getByRole('button', { name: 'Print / PDF' }));
    expect(printPage).toHaveBeenCalled();
  });

  it('starts a new event only after confirming', async () => {
    const { path } = report(makeFinishedMeeting());
    fireEvent.click(screen.getByRole('button', { name: 'Start new event' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Not anymore' }));
    await act(async () => {});
    expect(path()).toBe('/events/m1/report');

    fireEvent.click(screen.getByRole('button', { name: 'Start new event' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, do it' }));
    await act(async () => {});
    expect(path()).toBe('/events/new');
  });

  it('previews the e-mail without a chart image when there is no chart', async () => {
    report(makeFinishedMeeting());
    fireEvent.click(screen.getByRole('button', { name: 'Copy report' }));
    expect(
      await screen.findByRole('dialog', { name: 'Report preview' }),
    ).toBeInTheDocument();
    expect(chart.toPng).not.toHaveBeenCalled();
  });

  it('previews the e-mail with the chart in light colours', async () => {
    chart.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    report(makeFinishedMeeting());
    fireEvent.click(screen.getByRole('button', { name: 'Copy report' }));
    const dialog = await screen.findByRole('dialog', { name: 'Report preview' });
    expect(within(dialog).getByAltText('Burndown chart')).toHaveAttribute(
      'src',
      'data:image/png;base64,CHART',
    );
    expect(chart.toPng).toHaveBeenCalledWith(
      chart.svg,
      expect.objectContaining({ background: '#ffffff' }),
    );
    const recolor = (chart.toPng.mock.calls[0] as unknown[])[1] as {
      recolor: string[][];
    };
    expect(recolor.recolor).toContainEqual(['', 'light-progress']);

    // The footer's Close (the X in the corner is also called Close).
    fireEvent.click(
      within(dialog).getAllByRole('button', { name: 'Close' }).at(-1) as HTMLElement,
    );
    theme.lightBg = '#fafafa';
    fireEvent.click(screen.getByRole('button', { name: 'Copy report' }));
    await screen.findByRole('dialog');
    expect(chart.toPng).toHaveBeenLastCalledWith(
      chart.svg,
      expect.objectContaining({ background: '#fafafa' }),
    );
  });

  it('offers the owner everyone else’s emails for the CC field, once each', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText },
    });
    report(makeFinishedMeeting(), 'owner', {
      store: {
        members: [
          makeMember({ email: 'bruno@example.com' }),
          makeMember({ key: 'b2', email: ' Bruno@Example.com ' }),
          makeMember({ key: 'me', email: 'ANA@example.com' }),
          makeMember({ key: 'blank', email: '  ' }),
          makeMember({ key: 'c', email: 'carla@example.com' }),
        ],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copy report' }));
    const copy = await screen.findByRole('button', { name: 'Copy participants’ emails' });
    expect(copy).toBeEnabled();
    fireEvent.click(copy);
    await act(async () => {});
    expect(screen.getByText('Copied 2 emails!')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('bruno@example.com, carla@example.com');
  });

  it('hides the participants from anyone but the owner', async () => {
    report(makeFinishedMeeting(), 'contributor');
    fireEvent.click(screen.getByRole('button', { name: 'Copy report' }));
    await screen.findByRole('dialog');
    expect(
      screen.queryByRole('button', { name: 'Copy participants’ emails' }),
    ).toBeNull();
  });
});
