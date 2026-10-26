import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeAuthUser, makeFinishedMeeting, makeLiveMeeting } from '../test/fixtures';
import { renderWithApp, type RenderOptions } from '../test/render';
import { BottomTabBar, MobileTopBar } from './MobileNav';

const signOut = vi.fn(async () => {});

function topBar(user: ReturnType<typeof makeAuthUser> | null = makeAuthUser()) {
  return renderWithApp(<MobileTopBar />, {
    auth: { status: 'authenticated', user, signOut },
    viewport: 'phone',
  });
}

const openAccount = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
  return screen.getByRole('dialog', { name: 'Account' });
};

describe('MobileTopBar', () => {
  it('shows who you are in the account menu', () => {
    topBar(makeAuthUser({ photoURL: 'https://img/a.png' }));
    const menu = openAccount();
    expect(within(menu).getByText('Ana')).toBeInTheDocument();
    expect(within(menu).getByText('ana@example.com')).toBeInTheDocument();
    expect(menu.querySelector('img')).toHaveAttribute('src', 'https://img/a.png');
  });

  it('names you by email when there is no display name', () => {
    topBar(makeAuthUser({ displayName: null }));
    const menu = openAccount();
    expect(within(menu).getByText('ana@example.com')).toBeInTheDocument();
    expect(within(menu).getByText('A')).toBeInTheDocument();
  });

  it('falls back to a question mark with nothing to go by', () => {
    topBar(null);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('opens privacy and data in place of the menu', () => {
    topBar();
    fireEvent.click(
      within(openAccount()).getByRole('button', { name: 'Privacy and data' }),
    );
    expect(screen.getByRole('dialog', { name: 'Privacy and data' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Account' })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('signs out, closing the menu', () => {
    topBar();
    fireEvent.click(within(openAccount()).getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes the menu', () => {
    topBar();
    openAccount();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('BottomTabBar', () => {
  const tabs = (store: RenderOptions['store'], route = '/') => {
    renderWithApp(<BottomTabBar />, { store, route, viewport: 'phone' });
    return screen.getByRole('navigation', { name: 'Main' });
  };

  it('marks the current tab and adds the live event while one runs', () => {
    const nav = tabs({ currentMeeting: makeLiveMeeting({ id: 'live' }) }, '/events');
    expect(within(nav).getByRole('link', { name: /History/ }).className).toMatch(
      /active/,
    );
    expect(within(nav).getByRole('link', { name: /Home/ }).className).not.toMatch(
      /active/,
    );
    expect(within(nav).getByRole('link', { name: /Live/ })).toHaveAttribute(
      'href',
      '/events/live',
    );
  });

  it('leaves out an event that hasn’t started or is over', () => {
    expect(tabs({ currentMeeting: makeFinishedMeeting() })).not.toHaveTextContent('Live');
  });
});
