import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationPermissionState } from '../../../common/services/notifications';

const browser = vi.hoisted(() => ({
  permission: 'default' as NotificationPermissionState,
  answer: 'granted' as NotificationPermissionState,
}));

vi.mock('../../../common/services/notifications', () => ({
  notificationPermission: () => browser.permission,
  requestNotificationPermission: vi.fn(async () => browser.answer),
}));

async function freshStore() {
  vi.resetModules();
  return await import('./alertsStore');
}

beforeEach(() => {
  browser.permission = 'default';
  browser.answer = 'granted';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('alertsStore', () => {
  it('starts with the saved choice and the browser’s permission', async () => {
    localStorage.setItem('tw-threshold-alerts', '1');
    browser.permission = 'granted';
    const { useAlertsStore, selectAlertsOn } = await freshStore();
    expect(useAlertsStore.getState()).toMatchObject({
      enabled: true,
      permission: 'granted',
    });
    expect(selectAlertsOn(useAlertsStore.getState())).toBe(true);
  });

  it('starts off when storage can’t be read', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { useAlertsStore, selectAlertsOn } = await freshStore();
    expect(useAlertsStore.getState().enabled).toBe(false);
    expect(selectAlertsOn(useAlertsStore.getState())).toBe(false);
  });

  it('turns on after the browser allows it, and remembers', async () => {
    const { useAlertsStore } = await freshStore();
    await useAlertsStore.getState().toggle();
    expect(useAlertsStore.getState()).toMatchObject({
      enabled: true,
      permission: 'granted',
    });
    expect(localStorage.getItem('tw-threshold-alerts')).toBe('1');
  });

  it('stays off when the browser refuses', async () => {
    browser.answer = 'denied';
    const { useAlertsStore } = await freshStore();
    await useAlertsStore.getState().toggle();
    expect(useAlertsStore.getState()).toMatchObject({
      enabled: false,
      permission: 'denied',
    });
    expect(localStorage.getItem('tw-threshold-alerts')).toBe('0');
  });

  it('turns off when on, even if storage can’t be written', async () => {
    localStorage.setItem('tw-threshold-alerts', '1');
    browser.permission = 'granted';
    const { useAlertsStore } = await freshStore();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    await useAlertsStore.getState().toggle();
    expect(useAlertsStore.getState().enabled).toBe(false);
  });

  it('re-reads the permission on demand', async () => {
    const { useAlertsStore } = await freshStore();
    browser.permission = 'denied';
    useAlertsStore.getState().syncPermission();
    expect(useAlertsStore.getState().permission).toBe('denied');
  });
});
