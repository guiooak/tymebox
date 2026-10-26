import { act, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeFinishedMeeting, makeGoal, makeLiveMeeting } from '../../../test/fixtures';
import { renderWithApp } from '../../../test/render';
import { alertThresholds } from '../domain/timeAlerts';
import type { Meeting } from '../domain/types';
import { useMeetingStore } from '../store';

vi.mock('../../../common/services/notifications', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../common/services/notifications')>()),
  notify: vi.fn(),
}));

const { notify } = await import('../../../common/services/notifications');
const { useAlertsStore } = await import('./alertsStore');
const { ThresholdAlertsWatcher } = await import('./ThresholdAlertsWatcher');

const initialAlerts = useAlertsStore.getState();
const syncPermission = vi.fn();

function watch(meeting: Meeting | null, on = true) {
  useAlertsStore.setState({
    enabled: on,
    permission: 'granted',
    syncPermission,
  });
  return renderWithApp(<ThresholdAlertsWatcher />, {
    store: { currentMeeting: meeting },
  });
}

// Nothing done yet, so it trends late well before the end.
const live = makeLiveMeeting({
  name: 'Weekly sync',
  goals: [makeGoal({ id: 'a' }), makeGoal({ id: 'b' })],
});
const { warnAfterTs, endTs } = alertThresholds(live);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(Date.parse(live.realStartTime));
  vi.mocked(notify).mockClear();
  syncPermission.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  useAlertsStore.setState(initialAlerts, true);
});

const titles = () => vi.mocked(notify).mock.calls.map(([title]) => title);

describe('ThresholdAlertsWatcher', () => {
  it('warns when the event trends late, then when time is up', () => {
    expect(warnAfterTs).not.toBeNull();
    watch(live);
    expect(notify).not.toHaveBeenCalled();

    vi.setSystemTime(warnAfterTs as number);
    act(() => vi.advanceTimersByTime(5000));
    expect(titles()).toEqual(['Trending late']);
    expect(notify).toHaveBeenLastCalledWith('Trending late', {
      body: expect.stringContaining('“Weekly sync” is behind'),
      tag: 'tw-late-m1',
    });

    vi.setSystemTime(endTs as number);
    act(() => vi.advanceTimersByTime(5000));
    expect(titles()).toEqual(['Trending late', 'Time is up']);
    expect(notify).toHaveBeenLastCalledWith('Time is up', {
      body: '“Weekly sync” has reached its planned end time.',
      tag: 'tw-overdue-m1',
    });
  });

  it('reports a state already entered when it starts watching another event', () => {
    vi.setSystemTime(endTs as number);
    watch(live);
    expect(titles()).toEqual(['Time is up']);
    act(() => {
      useMeetingStore.setState({ currentMeeting: { ...live, id: 'm2' } });
    });
    expect(titles()).toEqual(['Time is up', 'Time is up']);
  });

  it('stays quiet when alerts are off, nothing runs, or the event is over', () => {
    vi.setSystemTime(endTs as number);
    const { unmount } = watch(live, false);
    unmount();
    watch(null).unmount();
    watch(makeFinishedMeeting());
    act(() => vi.advanceTimersByTime(10000));
    expect(notify).not.toHaveBeenCalled();
  });

  it('re-reads the permission when the viewer comes back to the tab', () => {
    const { unmount } = watch(null);
    fireEvent.focus(window);
    expect(syncPermission).toHaveBeenCalledTimes(1);

    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    expect(syncPermission).toHaveBeenCalledTimes(1);
    visibility.mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    expect(syncPermission).toHaveBeenCalledTimes(2);

    unmount();
    fireEvent.focus(window);
    expect(syncPermission).toHaveBeenCalledTimes(2);
  });
});
