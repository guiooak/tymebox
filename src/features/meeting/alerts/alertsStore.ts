import {
  notificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState,
} from '../../../common/services/notifications';
import { createStore } from '../../../common/services/state';

const STORAGE_KEY = 'tw-threshold-alerts';

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeEnabled(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Storage unavailable (private mode): the choice lasts the session.
  }
}

export type AlertsState = {
  /** The viewer opted in. Alerts only fire when this and the permission agree. */
  enabled: boolean;
  permission: NotificationPermissionState;
  /** Re-read the browser permission, which can change in its settings at any time. */
  syncPermission: () => void;
  toggle: () => Promise<void>;
};

/**
 * Opt-in browser alerts for running events. Shared between the dashboard's
 * switch and the app-level watcher, so alerts keep firing on any screen.
 */
export const useAlertsStore = createStore<AlertsState>()((set, get) => ({
  enabled: readEnabled(),
  permission: notificationPermission(),
  syncPermission: () => set({ permission: notificationPermission() }),
  toggle: async () => {
    const { enabled, permission } = get();
    if (enabled && permission === 'granted') {
      writeEnabled(false);
      set({ enabled: false });
      return;
    }
    const next = await requestNotificationPermission();
    const granted = next === 'granted';
    writeEnabled(granted);
    set({ permission: next, enabled: granted });
  },
}));

/** Whether alerts will actually fire: opted in and allowed by the browser. */
export const selectAlertsOn = (state: AlertsState) =>
  state.enabled && state.permission === 'granted';
