import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * firebaseApp.ts decides at import time: which project, whether to use the
 * emulators, whether to turn on App Check. Each test loads a fresh copy with
 * its own environment and the Firebase SDK replaced.
 */

const sdk = {
  initializeApp: vi.fn(() => ({ name: 'app' })),
  initializeAppCheck: vi.fn(),
  ReCaptchaEnterpriseProvider: vi.fn(function (this: { key: string }, key: string) {
    this.key = key;
  }),
  getDatabase: vi.fn(() => ({ name: 'db' })),
  connectDatabaseEmulator: vi.fn(),
};

async function load(env: Record<string, string | boolean>) {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) {
    vi.stubEnv(name, value as string);
  }
  vi.doMock('firebase/app', () => ({ initializeApp: sdk.initializeApp }));
  vi.doMock('firebase/app-check', () => ({
    initializeAppCheck: sdk.initializeAppCheck,
    ReCaptchaEnterpriseProvider: sdk.ReCaptchaEnterpriseProvider,
  }));
  vi.doMock('firebase/database', () => ({
    getDatabase: sdk.getDatabase,
    connectDatabaseEmulator: sdk.connectDatabaseEmulator,
  }));
  return import('./firebaseApp');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  delete (self as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean })
    .FIREBASE_APPCHECK_DEBUG_TOKEN;
});

describe('firebaseApp', () => {
  it('starts the configured project, without App Check when no key is set', async () => {
    const module = await load({
      VITE_USE_EMULATORS: '',
      VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: '',
    });
    expect(sdk.initializeApp).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'test-api-key', projectId: 'demo-tymebox' }),
    );
    expect(module.usingEmulators).toBe(false);
    expect(sdk.initializeAppCheck).not.toHaveBeenCalled();
  });

  it('creates the database once and talks to the real service', async () => {
    const { getDb } = await load({ VITE_USE_EMULATORS: '' });
    expect(getDb()).toBe(getDb());
    expect(sdk.getDatabase).toHaveBeenCalledTimes(1);
    expect(sdk.connectDatabaseEmulator).not.toHaveBeenCalled();
  });

  it('points the database at the local emulator, and skips App Check there', async () => {
    const { getDb, usingEmulators } = await load({
      VITE_USE_EMULATORS: '1',
      VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: 'site-key',
    });
    expect(usingEmulators).toBe(true);
    const db = getDb();
    expect(sdk.connectDatabaseEmulator).toHaveBeenCalledWith(db, '127.0.0.1', 9000);
    expect(sdk.initializeAppCheck).not.toHaveBeenCalled();
  });

  it('turns on App Check with the site key in production', async () => {
    await load({
      VITE_USE_EMULATORS: '',
      VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: 'site-key',
      DEV: false,
    });
    expect(sdk.ReCaptchaEnterpriseProvider).toHaveBeenCalledWith('site-key');
    expect(sdk.initializeAppCheck).toHaveBeenCalledWith(
      { name: 'app' },
      {
        provider: expect.objectContaining({ key: 'site-key' }),
        isTokenAutoRefreshEnabled: true,
      },
    );
    expect(
      (self as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN,
    ).toBeUndefined();
  });

  it('asks for a debug token when App Check runs in local development', async () => {
    await load({
      VITE_USE_EMULATORS: '',
      VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: 'site-key',
      DEV: true,
    });
    expect(
      (self as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN,
    ).toBe(true);
    expect(sdk.initializeAppCheck).toHaveBeenCalled();
  });
});
