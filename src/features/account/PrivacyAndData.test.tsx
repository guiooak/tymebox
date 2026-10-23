import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('./accountRepository', () => ({
  summarizeAccount: vi.fn(async () => ({ events: 3, sharedEvents: 1 })),
  exportAccount: vi.fn(),
  deleteAccount: vi.fn(async () => {}),
}));
vi.mock('../../common/services/auth', () => ({
  observeAuth: vi.fn(() => () => {}),
  signInWithGoogle: vi.fn(),
  signOutUser: vi.fn(),
}));

const { deleteAccount } = await import('./accountRepository');
const { useAuthStore } = await import('../auth');
const { DialogProvider } = await import('../../common/components');
const { PrivacyAndData } = await import('./PrivacyAndData');

const onClose = vi.fn();

function renderOpen() {
  return render(
    <DialogProvider>
      <PrivacyAndData open onClose={onClose} />
    </DialogProvider>,
  );
}

beforeEach(() => {
  vi.mocked(deleteAccount).mockClear();
  onClose.mockClear();
  useAuthStore.setState({
    status: 'authenticated',
    user: { uid: 'me', email: 'me@example.com', displayName: 'Me', photoURL: null },
  });
});

describe('PrivacyAndData', () => {
  it('shows what we keep about you, with your event counts', async () => {
    renderOpen();
    expect(screen.getByText('me@example.com')).toBeInTheDocument();
    expect(
      await screen.findByText('3 events, 1 shared with other people'),
    ).toBeInTheDocument();
  });

  it('deletes only after the confirmation word is typed', async () => {
    renderOpen();
    await screen.findByText('3 events, 1 shared with other people');
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

    const confirm = screen.getByRole('button', { name: 'Delete my account' });
    expect(confirm).toBeDisabled();
    const input = screen.getByLabelText('Type DELETE to confirm');
    fireEvent.change(input, { target: { value: 'delet' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: 'delete' } });
    expect(confirm).toBeEnabled();

    fireEvent.click(confirm);
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Account deleted')).toBeInTheDocument();
  });

  it('goes back without deleting anything', async () => {
    renderOpen();
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: 'Export my data' })).toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();
  });
});
