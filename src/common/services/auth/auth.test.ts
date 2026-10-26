import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * auth.ts wraps Firebase Auth. Each test loads it with the SDK replaced and
 * the emulators either on or off.
 */

const sdk = {
  getAuth: vi.fn(),
  connectAuthEmulator: vi.fn(),
  signInWithCredential: vi.fn(async () => {}),
  signInWithPopup: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
  reauthenticateWithPopup: vi.fn(async () => {}),
  deleteUser: vi.fn(async () => {}),
  onAuthStateChanged: vi.fn(),
  credential: vi.fn((token: string) => ({ token })),
};

const fakeAuth: { currentUser: unknown } = { currentUser: null };

async function load(usingEmulators: boolean) {
  vi.resetModules();
  sdk.getAuth.mockReturnValue(fakeAuth);
  vi.doMock('firebase/auth', () => ({
    ...sdk,
    GoogleAuthProvider: Object.assign(function GoogleAuthProvider() {}, {
      credential: sdk.credential,
    }),
  }));
  vi.doMock('../database', () => ({ firebaseApp: 'app', usingEmulators }));
  return import('./auth');
}

afterEach(() => {
  vi.clearAllMocks();
  fakeAuth.currentUser = null;
});

describe('signing in and out', () => {
  it('uses the real service, with the Google popup', async () => {
    const auth = await load(false);
    expect(sdk.getAuth).toHaveBeenCalledWith('app');
    expect(sdk.connectAuthEmulator).not.toHaveBeenCalled();
    await auth.signInWithGoogle();
    await auth.signOutUser();
    expect(sdk.signInWithPopup).toHaveBeenCalledWith(fakeAuth, expect.anything());
    expect(sdk.signOut).toHaveBeenCalledWith(fakeAuth);
  });

  it('talks to the Auth emulator locally', async () => {
    await load(true);
    expect(sdk.connectAuthEmulator).toHaveBeenCalledWith(
      fakeAuth,
      'http://127.0.0.1:9099',
      {
        disableWarnings: true,
      },
    );
  });

  it('signs in as a made-up account on the emulators only', async () => {
    const auth = await load(true);
    await auth.signInAsTestUser('bruno@example.com');
    expect(sdk.credential).toHaveBeenCalledWith(
      JSON.stringify({
        sub: 'bruno@example.com',
        email: 'bruno@example.com',
        email_verified: true,
        name: 'bruno',
      }),
    );
    await auth.signInAsTestUser('carla@example.com', 'Carla Souza');
    expect(sdk.credential).toHaveBeenLastCalledWith(
      expect.stringContaining('"name":"Carla Souza"'),
    );
    expect(sdk.signInWithCredential).toHaveBeenCalledTimes(2);

    const real = await load(false);
    await expect(real.signInAsTestUser('x@example.com')).rejects.toThrow(
      'only works against the Firebase emulators',
    );
  });

  it('reports who is signed in, or null', async () => {
    const auth = await load(false);
    const off = vi.fn();
    sdk.onAuthStateChanged.mockReturnValueOnce(off);
    const callback = vi.fn();
    expect(auth.observeAuth(callback)).toBe(off);
    const listener = sdk.onAuthStateChanged.mock.calls[0][1] as (user: unknown) => void;
    listener({
      uid: 'u1',
      displayName: 'Ana',
      email: 'ana@x.com',
      photoURL: null,
      extra: 1,
    });
    listener(null);
    expect(callback.mock.calls).toEqual([
      [{ uid: 'u1', displayName: 'Ana', email: 'ana@x.com', photoURL: null }],
      [null],
    ]);
  });
});

describe('deleting the account', () => {
  it('asks Google to sign in again first, except on the emulators', async () => {
    const auth = await load(false);
    fakeAuth.currentUser = { uid: 'u1' };
    await auth.reauthenticate();
    expect(sdk.reauthenticateWithPopup).toHaveBeenCalledWith(
      { uid: 'u1' },
      expect.anything(),
    );

    const local = await load(true);
    await local.reauthenticate();
    expect(sdk.reauthenticateWithPopup).toHaveBeenCalledTimes(1);
  });

  it('deletes the signed-in account', async () => {
    const auth = await load(false);
    fakeAuth.currentUser = { uid: 'u1' };
    await auth.deleteCurrentUser();
    expect(sdk.deleteUser).toHaveBeenCalledWith({ uid: 'u1' });
  });

  it('refuses both without anyone signed in', async () => {
    const auth = await load(false);
    await expect(auth.reauthenticate()).rejects.toThrow('Nobody is signed in');
    await expect(auth.deleteCurrentUser()).rejects.toThrow('Nobody is signed in');
  });
});
