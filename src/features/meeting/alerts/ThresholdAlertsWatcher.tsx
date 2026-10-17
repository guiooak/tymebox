import { useEffect, useRef } from 'react';
import { notify } from '../../../common/services/notifications';
import {
  alertCrossings,
  alertState,
  alertThresholds,
  type AlertState,
} from '../domain/timeAlerts';
import { useMeetingStore } from '../store';
import { selectAlertsOn, useAlertsStore } from './alertsStore';

const CHECK_EVERY_MS = 5000;

/**
 * Sends the "trending late" and "time is up" notifications for the running
 * event. Mounted once for the signed-in app rather than on the dashboard, so
 * alerts keep coming while the facilitator is on another screen.
 *
 * Browsers throttle timers in background tabs (Chrome to about once a minute
 * after a few minutes hidden), so an alert can arrive up to a minute late there.
 */
export function ThresholdAlertsWatcher() {
  const meeting = useMeetingStore((state) => state.currentMeeting);
  const on = useAlertsStore(selectAlertsOn);
  const syncPermission = useAlertsStore((state) => state.syncPermission);
  const previous = useRef<{ id: string; state: AlertState } | null>(null);

  // The permission can change in the browser's settings; pick it up whenever
  // the viewer comes back to the tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        syncPermission();
      }
    };
    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [syncPermission]);

  const running = !!meeting?.realStartTime && !meeting.realEndTime;

  useEffect(() => {
    if (!on || !meeting || !running) {
      previous.current = null;
      return;
    }
    const thresholds = alertThresholds(meeting);
    const check = () => {
      const state = alertState(thresholds, Date.now());
      const last = previous.current?.id === meeting.id ? previous.current.state : null;
      previous.current = { id: meeting.id, state };
      for (const crossing of alertCrossings(last, state)) {
        if (crossing === 'late') {
          notify('Trending late', {
            body: `“${meeting.name}” is behind: the current milestone has run over its share of the time.`,
            tag: `tw-late-${meeting.id}`,
          });
        } else {
          notify('Time is up', {
            body: `“${meeting.name}” has reached its planned end time.`,
            tag: `tw-overdue-${meeting.id}`,
          });
        }
      }
    };
    check();
    const id = setInterval(check, CHECK_EVERY_MS);
    return () => clearInterval(id);
  }, [on, meeting, running]);

  return null;
}
