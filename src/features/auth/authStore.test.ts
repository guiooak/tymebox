import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../common/services/auth';

const auth = vi.hoisted(() => ({
  listener: null as ((user: AuthUser | null) => void) | null,
}));

vi.mock('../../common/services/auth', () => ({
  observeAuth: vi.fn((listener: (user: AuthUser | null) => void) => {
    auth.listener = listener;
    return () => {};
  }),
  signInWithGoogle: vi.fn(async () => {}),
  signOutUser: vi.fn(async () => {}),
}));

const { observeAuth, signInWithGoogle, signOutUser } =
  await import('../../common/services/auth');
const { useAuthStore } = await import('./authStore');

describe('authStore', () => {
  it('follows the sign-in state, listening only once', () => {
    expect(useAuthStore.getState().status).toBe('loading');
    useAuthStore.getState().init();
    useAuthStore.getState().init();
    expect(observeAuth).toHaveBeenCalledTimes(1);

    const user = { uid: 'u1', email: 'a@b.c', displayName: 'A', photoURL: null };
    auth.listener?.(user as AuthUser);
    expect(useAuthStore.getState()).toMatchObject({ user, status: 'authenticated' });
    auth.listener?.(null);
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      status: 'unauthenticated',
    });
  });

  it('signs in with Google and signs out', async () => {
    await useAuthStore.getState().signIn();
    await useAuthStore.getState().signOut();
    expect(signInWithGoogle).toHaveBeenCalled();
    expect(signOutUser).toHaveBeenCalled();
  });
});
