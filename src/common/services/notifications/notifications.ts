/** Our interface over the browser Notification API. */
export type NotificationPermissionState =
  | 'unsupported'
  | 'default'
  | 'granted'
  | 'denied';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermissionState {
  if (!notificationsSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!notificationsSupported()) {
    return 'unsupported';
  }
  try {
    return (await Notification.requestPermission()) as NotificationPermissionState;
  } catch {
    return 'denied';
  }
}

export type NotifyOptions = {
  body?: string;
  /** Replaces an earlier notification with the same tag instead of stacking. */
  tag?: string;
};

/** Fire-and-forget notification; silently does nothing without permission. */
export function notify(title: string, options: NotifyOptions = {}): void {
  if (notificationPermission() !== 'granted') {
    return;
  }
  try {
    new Notification(title, options);
  } catch {
    // Some browsers only allow notifications from a service worker context.
  }
}
