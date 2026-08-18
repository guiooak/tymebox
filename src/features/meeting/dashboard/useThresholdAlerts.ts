import { useEffect, useRef, useState } from 'react';
import {
  notificationPermission,
  notify,
  requestNotificationPermission,
  type NotificationPermissionState,
} from '../../../common/services/notifications';

const STORAGE_KEY = 'tw-threshold-alerts';

export type ThresholdAlertsOptions = {
  /** Only alert while an event is actually running. */
  active: boolean;
  eventName: string;
  /** Timestamp after which the event is trending late (null when it never is). */
  warnAfterTs: number | null;
  /** Timestamp the event is supposed to end (null when unscheduled). */
  endTs: number | null;
};

export type ThresholdAlerts = {
  enabled: boolean;
  permission: NotificationPermissionState;
  toggle: () => Promise<void>;
};

/**
 * Opt-in browser notifications for the two moments a facilitator cares about
 * while looking at another tab: crossing the tendency line, and running out of
 * time. Each fires at most once per mounted event.
 */
export function useThresholdAlerts({
  active,
  eventName,
  warnAfterTs,
  endTs,
}: ThresholdAlertsOptions): ThresholdAlerts {
  const [enabled, setEnabled] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1',
  );
  const [permission, setPermission] = useState<NotificationPermissionState>(() =>
    notificationPermission(),
  );
  const fired = useRef({ warn: false, overdue: false });

  useEffect(() => {
    if (!enabled || !active || permission !== 'granted') {
      return;
    }
    const check = () => {
      const now = Date.now();
      if (warnAfterTs != null && now >= warnAfterTs && !fired.current.warn) {
        fired.current.warn = true;
        notify('Trending late ⚠️', {
          body: `${eventName} is now behind its tendency line.`,
          tag: 'tw-warn',
        });
      }
      if (endTs != null && now >= endTs && !fired.current.overdue) {
        fired.current.overdue = true;
        notify('Time is up ⏰', {
          body: `${eventName} has reached its planned end time.`,
          tag: 'tw-overdue',
        });
      }
    };
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, [enabled, active, permission, warnAfterTs, endTs, eventName]);

  const toggle = async () => {
    if (enabled) {
      setEnabled(false);
      localStorage.setItem(STORAGE_KEY, '0');
      return;
    }
    const next = await requestNotificationPermission();
    setPermission(next);
    const granted = next === 'granted';
    setEnabled(granted);
    localStorage.setItem(STORAGE_KEY, granted ? '1' : '0');
  };

  return { enabled, permission, toggle };
}
