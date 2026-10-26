import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeAccess, makeRequest, makeViewer } from '../../../test/fixtures';
import { renderWithApp, type RenderOptions } from '../../../test/render';
import { useMeetingStore } from '../store';
import { NoAccess } from './NoAccess';

function page(store: RenderOptions['store'] = {}) {
  const requestAccess = vi.fn(async () => {});
  const cancelAccessRequest = vi.fn(async () => {});
  const view = renderWithApp(<NoAccess />, {
    store: {
      user: makeViewer(),
      access: makeAccess({ owner: 'u2' }),
      myRequest: null,
      requestAccess,
      cancelAccessRequest,
      ...store,
    },
  });
  return { ...view, requestAccess, cancelAccessRequest };
}

describe('NoAccess', () => {
  it('says an event that doesn’t exist (or isn’t yours) looks the same, with a way Home', () => {
    const { path } = page({ access: null });
    expect(
      screen.getByRole('heading', { name: 'You don’t have access to this event' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/doesn’t exist, or it hasn’t been shared/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request access' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Go to Home' }));
    expect(path()).toBe('/');
  });

  it('asks the owner for access, with an optional message', async () => {
    const { requestAccess } = page();
    expect(screen.getByText(/from ana@example\.com/)).toBeInTheDocument();
    const message = screen.getByLabelText('Message to the owner (optional)');
    fireEvent.change(message, { target: { value: 'I run this meeting' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request access' }));
    });
    expect(requestAccess).toHaveBeenCalledWith('I run this meeting');
    expect(message).toHaveValue('');
  });

  it('asks without naming you when the account has no email', () => {
    page({ user: null });
    expect(
      screen.getByText(/They'll see your request and can let you in/),
    ).toBeInTheDocument();
  });

  it('says so when the request couldn’t be sent', async () => {
    const requestAccess = vi.fn(async () => {
      throw new Error('denied');
    });
    page({ requestAccess });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request access' }));
    });
    expect(
      screen.getByText('Couldn’t send the request. Check the link and try again.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request access' })).toBeEnabled();
  });

  it('shows a pending request, which can be withdrawn without reading as declined', async () => {
    const request = makeRequest({ requestedAt: Date.parse('2026-01-01T10:00:00.000Z') });
    const { cancelAccessRequest } = page({ myRequest: request });
    expect(screen.getByRole('heading', { name: 'Request sent' })).toBeInTheDocument();
    expect(
      screen.getByText(/You asked for access on .*January 1st 2026/),
    ).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel request' }));
    });
    expect(cancelAccessRequest).toHaveBeenCalled();

    act(() => useMeetingStore.setState({ myRequest: null }));
    expect(
      screen.getByRole('heading', { name: 'You don’t have access to this event' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request access' })).toBeInTheDocument();
  });

  it('tells you when the owner turned the request down, and lets you ask again', () => {
    page({ myRequest: makeRequest() });
    act(() => useMeetingStore.setState({ myRequest: null }));
    expect(
      screen.getByRole('heading', { name: 'The owner didn’t approve your request' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask again' })).toBeInTheDocument();
  });

  it('keeps the request when withdrawing fails, so its disappearing later reads as declined', async () => {
    const cancelAccessRequest = vi.fn(async () => {
      throw new Error('offline');
    });
    page({ myRequest: makeRequest(), cancelAccessRequest });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel request' }));
    });
    expect(screen.getByRole('button', { name: 'Cancel request' })).toBeEnabled();
    act(() => useMeetingStore.setState({ myRequest: null }));
    expect(screen.getByRole('heading', { name: /didn’t approve/ })).toBeInTheDocument();
  });

  it('follows a request that is replaced by a new one', () => {
    page({ myRequest: makeRequest() });
    act(() => useMeetingStore.setState({ myRequest: makeRequest({ requestedAt: 5 }) }));
    expect(screen.getByRole('heading', { name: 'Request sent' })).toBeInTheDocument();
  });
});
