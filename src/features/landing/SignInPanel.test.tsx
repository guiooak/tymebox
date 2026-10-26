import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../common/services/database', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../common/services/database')>()),
  usingEmulators: true,
}));
vi.mock('../../common/services/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../common/services/auth')>()),
  signInAsTestUser: vi.fn(async () => {}),
}));

const { signInAsTestUser } = await import('../../common/services/auth');
const { useAuthStore } = await import('../auth');
const { SignInButton, TestSignIn } = await import('./SignInPanel');

describe('SignInButton', () => {
  it('shows it is busy, then why the sign-in failed', async () => {
    let fail!: (reason: unknown) => void;
    useAuthStore.setState({
      signIn: () => new Promise<void>((_, reject) => (fail = reject)),
    });
    render(<SignInButton withNotice={false} />);
    expect(screen.queryByText(/By continuing/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
    await act(async () => fail(new Error('popup blocked')));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Sign-in failed. Please try again.',
    );
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  });
});

describe('TestSignIn (emulators only)', () => {
  it('signs in as the typed address, trimmed', async () => {
    render(<TestSignIn />);
    fireEvent.change(screen.getByLabelText('Emulator: sign in as'), {
      target: { value: ' bruno@example.com ' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Test sign-in' }));
    });
    expect(signInAsTestUser).toHaveBeenCalledWith('bruno@example.com');
  });

  it('says so when the emulator refuses', async () => {
    vi.mocked(signInAsTestUser).mockRejectedValueOnce(new Error('[expected] down'));
    render(<TestSignIn />);
    fireEvent.change(screen.getByLabelText('Emulator: sign in as'), {
      target: { value: 'bruno@example.com' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Test sign-in' }));
    });
    expect(screen.getByText(/emulator/i, { selector: 'p' })).toBeInTheDocument();
  });
});
