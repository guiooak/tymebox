import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  makeAccess,
  makeMeeting,
  makeMember,
  makeRequest,
  makeViewer,
} from '../../../test/fixtures';
import { renderWithApp } from '../../../test/render';
import type { MeetingState } from '../store';
import { ShareButton } from './ShareButton';
import { ShareModal, eventLink } from './ShareModal';

const MIN = 60_000;
const NOW = new Date('2026-01-10T12:00:00.000Z');

afterEach(() => {
  vi.useRealTimers();
});

function owner(store: Partial<MeetingState> = {}) {
  const actions = {
    setVisibility: vi.fn(async () => {}),
    shareWith: vi.fn(async () => {}),
    setMemberRole: vi.fn(async () => {}),
    unshare: vi.fn(async () => {}),
    approveRequest: vi.fn(async () => {}),
    denyRequest: vi.fn(async () => {}),
  };
  const onClose = vi.fn();
  renderWithApp(<ShareModal open onClose={onClose} />, {
    store: {
      ...actions,
      user: makeViewer(),
      event: makeMeeting(),
      access: makeAccess(),
      role: 'owner',
      members: [],
      requests: [],
      ...store,
    },
  });
  return { ...actions, onClose };
}

const pick = (combobox: string, option: RegExp) => {
  fireEvent.click(screen.getByRole('combobox', { name: combobox }));
  fireEvent.click(screen.getByRole('option', { name: option }));
};

describe('ShareModal', () => {
  it('needs an open event with its access settings', () => {
    renderWithApp(<ShareModal open onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the link and copies it, saying so for a moment', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    owner();
    expect(
      screen.getByRole('dialog', { name: 'Share “Weekly planning”' }),
    ).toBeInTheDocument();
    const link = screen.getByRole('textbox', { name: 'Event link' });
    expect(link).toHaveValue(eventLink('m1'));
    expect(eventLink('m1')).toBe(`${window.location.origin}/events/m1`);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(eventLink('m1'));
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
  });

  it('stays quiet when the clipboard refuses the link', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('blocked'));
    owner();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    });
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
  });

  it('opens the event to anyone with the link, with a role, or keeps it private', () => {
    const { setVisibility } = owner();
    expect(screen.getByText(/Only you and the people below/)).toBeInTheDocument();
    pick('General access', /Anyone with the link/);
    expect(setVisibility).toHaveBeenCalledWith('public', 'viewer');
  });

  it('changes the role of anyone with the public link', () => {
    const { setVisibility } = owner({
      access: makeAccess({ visibility: 'public', publicRole: 'contributor' }),
    });
    expect(screen.getByText(/as a contributor/)).toBeInTheDocument();
    pick('Role for anyone with the link', /Viewer/);
    expect(setVisibility).toHaveBeenCalledWith('public', 'viewer');
  });

  it('adds a person by email with a role, refusing bad, own or repeated addresses', async () => {
    const { shareWith } = owner({ members: [makeMember()] });
    const email = screen.getByRole('textbox', { name: 'Email to share with' });
    // Submit the form itself: the browser's own check of type=email would stop a
    // click on Add before ours runs.
    const add = () =>
      act(async () => {
        fireEvent.submit(email.closest('form') as HTMLFormElement);
      });

    fireEvent.change(email, { target: { value: 'not-an-email' } });
    await add();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    fireEvent.change(email, { target: { value: 'Ana@Example.com' } });
    expect(screen.queryByText('Enter a valid email address.')).toBeNull();
    await add();
    expect(
      screen.getByText('That’s you — you already own this event.'),
    ).toBeInTheDocument();
    fireEvent.change(email, { target: { value: 'bruno@example.com' } });
    await add();
    expect(screen.getByText(/already has access/)).toBeInTheDocument();
    expect(shareWith).not.toHaveBeenCalled();

    fireEvent.change(email, { target: { value: '  carla@example.com ' } });
    pick('Role for the new person', /Contributor/);
    await add();
    expect(shareWith).toHaveBeenCalledWith('carla@example.com', 'contributor');
    expect(email).toHaveValue('');
  });

  it('lists you as owner, then everyone else, whose role can change or be removed', () => {
    const member = makeMember();
    const { setMemberRole, unshare } = owner({ members: [member] });
    const people = screen.getByText('Owner').closest('ul') as HTMLElement;
    expect(within(people).getByText('Ana')).toBeInTheDocument();
    expect(within(people).getByText('B')).toBeInTheDocument(); // initial avatar
    pick('Role for bruno@example.com', /Contributor/);
    expect(setMemberRole).toHaveBeenCalledWith(member, 'contributor');
    fireEvent.click(screen.getByRole('button', { name: 'Remove bruno@example.com' }));
    expect(unshare).toHaveBeenCalledWith(member);
  });

  it('shows the owner even when the profile has no name or email', () => {
    owner({
      user: makeViewer({
        name: '',
        email: '',
        photoURL: 'https://lh3.googleusercontent.com/a',
      }),
      event: makeMeeting({ ownerName: '' }),
    });
    expect(screen.getByText('Owner').closest('li')?.querySelector('img')).toHaveAttribute(
      'src',
      'https://lh3.googleusercontent.com/a',
    );
  });

  it('lists access requests with when they came, and approves or denies them', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const ago = (minutes: number) => NOW.getTime() - minutes * MIN;
    const requests = [
      makeRequest({ key: 'a', name: 'Carla', email: 'carla@x.com', requestedAt: ago(0) }),
      makeRequest({
        key: 'b',
        name: '',
        email: 'dan@x.com',
        message: '',
        requestedAt: ago(5),
      }),
      makeRequest({
        key: 'c',
        name: 'Eva',
        email: 'eva@x.com',
        requestedAt: ago(180),
        photoURL: 'p.png',
      }),
      makeRequest({
        key: 'd',
        name: 'Fay',
        email: 'fay@x.com',
        requestedAt: ago(3 * 24 * 60),
      }),
      makeRequest({ key: 'e', name: '  ', email: 'gus@x.com', requestedAt: ago(-5) }),
    ];
    const { approveRequest, denyRequest } = owner({ requests });
    const section = screen.getByRole('region', { name: /Requests/ });
    expect(within(section).getByText(/carla@x\.com · just now/)).toBeInTheDocument();
    expect(within(section).getByText('5 min ago')).toBeInTheDocument();
    expect(within(section).getByText(/3 h ago/)).toBeInTheDocument();
    expect(within(section).getByText(/3 d ago/)).toBeInTheDocument();
    expect(within(section).getAllByText('Can I join?')).toHaveLength(4);
    // A blank name falls back to the email, initial included.
    expect(within(section).getByText('gus@x.com')).toBeInTheDocument();
    expect(within(section).getByText('G')).toBeInTheDocument();

    pick('Role for carla@x.com', /Contributor/);
    await act(async () => {
      fireEvent.click(within(section).getAllByRole('button', { name: 'Approve' })[0]);
    });
    expect(approveRequest).toHaveBeenCalledWith(requests[0], 'contributor');
    await act(async () => {
      fireEvent.click(within(section).getAllByRole('button', { name: 'Deny' })[1]);
    });
    expect(denyRequest).toHaveBeenCalledWith(requests[1]);
  });

  it('frees the buttons again if an answer fails', async () => {
    const approveRequest = vi.fn(async () => {
      throw new Error('[expected] offline');
    });
    owner({ requests: [makeRequest()], approveRequest });
    const approve = screen.getByRole('button', { name: 'Approve' });
    await act(async () => {
      fireEvent.click(approve);
    });
    expect(approveRequest).toHaveBeenCalled();
    expect(approve).toBeEnabled();
  });

  it('falls back to "?" for an owner with no name anywhere', () => {
    owner({
      user: makeViewer({ name: '', email: '' }),
      event: makeMeeting({ ownerName: '' }),
    });
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('closes from Done', () => {
    const { onClose } = owner();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ShareButton', () => {
  it('shows nothing without an event and a role', () => {
    const { container } = renderWithApp(<ShareButton />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('opens the sharing modal for the owner, counting waiting requests', () => {
    renderWithApp(<ShareButton />, {
      store: {
        user: makeViewer(),
        event: makeMeeting(),
        access: makeAccess(),
        role: 'owner',
        requests: [makeRequest(), makeRequest({ key: 'x' })],
      },
    });
    const share = screen.getByRole('button', {
      name: 'Share — 2 access requests waiting',
    });
    expect(share).toHaveTextContent('Share2');
    fireEvent.click(share);
    expect(
      screen.getByRole('dialog', { name: 'Share “Weekly planning”' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a plain Share button with no requests', () => {
    renderWithApp(<ShareButton />, {
      store: { event: makeMeeting(), access: makeAccess(), role: 'owner', requests: [] },
    });
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
  });

  it('tells everyone else who shared it, and copies the link', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderWithApp(<ShareButton />, {
      store: { event: makeMeeting({ ownerName: 'Bruno' }), role: 'contributor' },
    });
    expect(screen.getByText('Shared by Bruno · Contributor')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    });
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
  });

  it('says "the owner" when their name is unknown, and survives a blocked clipboard', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('blocked'));
    renderWithApp(<ShareButton />, {
      store: { event: makeMeeting({ ownerName: '' }), role: 'viewer' },
    });
    expect(screen.getByText('Shared by the owner · Viewer')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    });
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
  });
});
