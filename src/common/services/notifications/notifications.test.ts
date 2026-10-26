import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  notificationPermission,
  notificationsSupported,
  notify,
  requestNotificationPermission,
} from './notifications';

/** A stand-in for the browser's Notification, with a given permission. */
function stubNotification(permission: string, request?: () => Promise<string>) {
  const created: Array<[string, unknown]> = [];
  const Fake = vi.fn(function (title: string, options: unknown) {
    created.push([title, options]);
  }) as unknown as typeof Notification & { permission: string };
  Object.assign(Fake, {
    permission,
    requestPermission: request ?? (async () => permission),
  });
  vi.stubGlobal('Notification', Fake);
  return created;
}

afterEach(() => {
  vi.unstubAllGlobals();
  // jsdom has no Notification of its own; make sure none is left behind.
  delete (window as { Notification?: unknown }).Notification;
});

describe('without Notification support', () => {
  it('reports unsupported and never notifies', async () => {
    delete (window as { Notification?: unknown }).Notification;
    expect(notificationsSupported()).toBe(false);
    expect(notificationPermission()).toBe('unsupported');
    expect(await requestNotificationPermission()).toBe('unsupported');
    expect(() => notify('Hi')).not.toThrow();
  });
});

describe('with Notification support', () => {
  it('reports the current permission', () => {
    stubNotification('default');
    expect(notificationsSupported()).toBe(true);
    expect(notificationPermission()).toBe('default');
  });

  it('asks for permission, treating a failed prompt as denied', async () => {
    stubNotification('default', async () => 'granted');
    expect(await requestNotificationPermission()).toBe('granted');

    stubNotification('default', async () => {
      throw new Error('blocked');
    });
    expect(await requestNotificationPermission()).toBe('denied');
  });

  it('shows a notification only once granted', () => {
    let created = stubNotification('denied');
    notify('Late');
    expect(created).toEqual([]);

    created = stubNotification('granted');
    notify('Late', { body: 'Behind plan', tag: 'late' });
    notify('Over');
    expect(created).toEqual([
      ['Late', { body: 'Behind plan', tag: 'late' }],
      ['Over', {}],
    ]);
  });

  it('ignores browsers that refuse to create one here', () => {
    vi.stubGlobal(
      'Notification',
      Object.assign(
        vi.fn(function () {
          throw new Error('Illegal constructor');
        }),
        { permission: 'granted' },
      ),
    );
    expect(() => notify('Late')).not.toThrow();
  });
});
