import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAuthUser } from '../../test/fixtures';
import { renderWithApp } from '../../test/render';

vi.mock('./accountRepository', () => ({
  summarizeAccount: vi.fn(async () => ({ events: 3, sharedEvents: 1 })),
  exportAccount: vi.fn(async () => ({ exportedAt: '2026-03-04T05:06:07.000Z' })),
  deleteAccount: vi.fn(async (_user: unknown, beforeErasing?: () => void) => {
    beforeErasing?.();
  }),
}));

const { deleteAccount, exportAccount, summarizeAccount } =
  await import('./accountRepository');
const { PrivacyAndData } = await import('./PrivacyAndData');

const onClose = vi.fn();
const release = vi.fn();
let setOpen: (open: boolean) => void = () => {};

/** Lets a test open and close the modal the way its parent would. */
function Harness({ initial }: { initial: boolean }) {
  const [open, set] = useState(initial);
  setOpen = set;
  return <PrivacyAndData open={open} onClose={onClose} />;
}

const toggle = (open: boolean) => act(() => setOpen(open));

function privacy(
  user: ReturnType<typeof makeAuthUser> | null = makeAuthUser({
    displayName: 'Me',
    email: 'me@example.com',
  }),
  open = true,
) {
  return renderWithApp(<Harness initial={open} />, {
    auth: { status: user ? 'authenticated' : 'unauthenticated', user },
    store: { release },
  });
}

/** A promise the test settles by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const counted = () => screen.findByText('3 events, 1 shared with other people');

async function startDeleting() {
  await counted();
  fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
  fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), {
    target: { value: ' delete ' },
  });
}

let click: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.mocked(summarizeAccount).mockClear();
  onClose.mockClear();
  release.mockClear();
  vi.mocked(deleteAccount).mockClear();
  click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  click.mockRestore();
});

describe('PrivacyAndData', () => {
  it('shows what we keep about you, with your event counts', async () => {
    privacy(makeAuthUser({ displayName: '', photoURL: 'https://img/me.png' }));
    expect(screen.getByText('Counting…')).toBeInTheDocument();
    expect(await counted()).toBeInTheDocument();
    const facts = screen.getByRole('dialog');
    expect(within(facts).getByText('—')).toBeInTheDocument();
    expect(facts.querySelector('img')).toHaveAttribute('src', 'https://img/me.png');
  });

  it('shows no counts until it is open, and none when they can’t be read', async () => {
    privacy(undefined, false);
    expect(summarizeAccount).not.toHaveBeenCalled();
    vi.mocked(summarizeAccount).mockRejectedValueOnce(new Error('offline'));
    toggle(true);
    expect(await screen.findByText('0 events')).toBeInTheDocument();
  });

  it('ignores counts that arrive after it closed', async () => {
    const late = deferred<{ events: number; sharedEvents: number }>();
    vi.mocked(summarizeAccount).mockReturnValueOnce(late.promise);
    privacy();
    toggle(false);
    await act(async () => late.resolve({ events: 9, sharedEvents: 0 }));
    expect(screen.queryByText('9 events')).toBeNull();

    const failing = deferred<{ events: number; sharedEvents: number }>();
    vi.mocked(summarizeAccount).mockReturnValueOnce(failing.promise);
    toggle(true);
    toggle(false);
    await act(async () => failing.reject(new Error('offline')));
    expect(screen.queryByText('0 events')).toBeNull();
  });

  it('downloads your data as a dated JSON file', async () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    privacy();
    await counted();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Export my data' }));
    });
    expect(exportAccount).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'u1', email: 'me@example.com' }),
    );
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('tymebox-2026-03-04.json');
    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect(revoke).toHaveBeenCalledWith(link.href);
  });

  it('says so when the export fails, and can’t be closed while busy', async () => {
    const pending = deferred<never>();
    vi.mocked(exportAccount).mockReturnValueOnce(pending.promise);
    privacy();
    await counted();
    fireEvent.click(screen.getByRole('button', { name: 'Export my data' }));
    expect(screen.getByRole('button', { name: 'Preparing…' })).toBeDisabled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => pending.reject(new Error('offline')));
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t export your data.');
  });

  it('does nothing without an email to export or delete for', async () => {
    privacy(makeAuthUser({ email: null }));
    fireEvent.click(screen.getByRole('button', { name: 'Export my data' }));
    expect(exportAccount).not.toHaveBeenCalledWith(expect.anything());
  });

  it('deletes after the word is typed, releasing the listeners first', async () => {
    privacy();
    await startDeleting();
    expect(
      screen.getByRole('dialog', { name: 'Delete your account?' }),
    ).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    });
    expect(release).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(await screen.findByText('Account deleted')).toBeInTheDocument();
  });

  it('skips deleting when you signed out meanwhile', async () => {
    privacy();
    await startDeleting();
    const { useAuthStore } = await import('../auth');
    act(() => useAuthStore.setState({ user: null }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it.each([
    [
      Object.assign(new Error('x'), { code: 'auth/popup-closed-by-user' }),
      'Nothing was deleted',
    ],
    [
      Object.assign(new Error('x'), { code: 'auth/user-cancelled' }),
      'Nothing was deleted',
    ],
    [
      Object.assign(new Error('x'), { code: 'permission-denied' }),
      'Something went wrong',
    ],
    [new Error('no code'), 'Something went wrong'],
    [null, 'Something went wrong'],
    ['text', 'Something went wrong'],
  ])('explains a failed delete (%s)', async (failure, message) => {
    vi.mocked(deleteAccount).mockRejectedValueOnce(failure);
    privacy();
    await startDeleting();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('goes back, and closing starts over', async () => {
    privacy();
    await startDeleting();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: 'Export my data' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    expect(screen.getByLabelText('Type DELETE to confirm')).toHaveValue('');
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('links to the privacy policy, closing itself', async () => {
    const { path } = privacy();
    fireEvent.click(screen.getByRole('link', { name: 'Read the Privacy Policy' }));
    expect(onClose).toHaveBeenCalled();
    expect(path()).toBe('/privacy');
    await waitFor(() => expect(summarizeAccount).toHaveBeenCalled());
  });
});
