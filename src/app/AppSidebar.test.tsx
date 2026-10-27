import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeAuthUser, makeLiveMeeting } from '../test/fixtures';
import { renderWithApp, type RenderOptions } from '../test/render';
import { useThemeStore } from '../common/services/theme';
import { AppSidebar } from './AppSidebar';

const signOut = vi.fn(async () => {});

function sidebar(user = makeAuthUser(), options: RenderOptions = {}) {
  return renderWithApp(<AppSidebar />, {
    auth: { status: 'authenticated', user, signOut },
    ...options,
  });
}

const collapseButton = () =>
  screen.getByRole('button', { name: /(Collapse|Expand) menu/ });

afterEach(() => {
  vi.restoreAllMocks();
  useThemeStore.getState().setMode('system');
});

describe('AppSidebar', () => {
  it('opens on desktop and collapses on tablets, until the user picks', () => {
    const desktop = sidebar();
    expect(collapseButton()).toHaveAccessibleName('Collapse menu');
    desktop.unmount();

    const tablet = sidebar(undefined, { viewport: 'tablet' });
    expect(collapseButton()).toHaveAccessibleName('Expand menu');
    fireEvent.click(collapseButton());
    expect(collapseButton()).toHaveAccessibleName('Collapse menu');
    expect(localStorage.getItem('tw-sidebar-collapsed')).toBe('0');
    tablet.unmount();

    localStorage.setItem('tw-sidebar-collapsed', '1');
    sidebar();
    expect(collapseButton()).toHaveAccessibleName('Expand menu');
  });

  it('still toggles when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    sidebar();
    fireEvent.click(collapseButton());
    expect(collapseButton()).toHaveAccessibleName('Expand menu');
  });

  it('lists the destinations, with the live event while one runs', () => {
    sidebar(undefined, { store: { currentMeeting: makeLiveMeeting({ id: 'live' }) } });
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav).toHaveTextContent('Live event');
    expect(screen.getByRole('link', { name: /Live event/ })).toHaveAttribute(
      'href',
      '/events/live',
    );
  });

  it('shows who is signed in: photo, or the first letter of the name or email', () => {
    const { container, unmount } = sidebar(
      makeAuthUser({ photoURL: 'https://img/a.png' }),
    );
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://img/a.png');
    unmount();
    sidebar(makeAuthUser({ displayName: null, email: 'bruno@example.com' }));
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('falls back to a question mark with no name at all', () => {
    sidebar(makeAuthUser({ displayName: null, email: null }));
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('keeps the account settings behind one row', () => {
    sidebar();
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Ana/ }));
    const menu = screen.getByRole('dialog', { name: 'Account' });

    fireEvent.click(
      within(menu).getByRole('button', { name: 'System theme. Switch to light theme' }),
    );
    expect(useThemeStore.getState().mode).toBe('light');

    fireEvent.click(within(menu).getByRole('button', { name: 'Privacy and data' }));
    expect(screen.getByRole('dialog', { name: 'Privacy and data' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Account' })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Ana/ }));
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    });
    expect(signOut).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the account menu from the collapsed rail too', () => {
    sidebar();
    fireEvent.click(collapseButton());
    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    expect(screen.getByRole('dialog', { name: 'Account' })).toBeInTheDocument();
  });

  it('shows the version at its foot only while expanded', () => {
    sidebar();
    expect(screen.getByTitle('Tymebox version')).toHaveTextContent('dev');
    fireEvent.click(collapseButton());
    expect(screen.queryByTitle('Tymebox version')).not.toBeInTheDocument();
  });

  it('links a released version to its notes on GitHub', () => {
    vi.stubEnv('VITE_APP_VERSION', '1.2.0');
    try {
      sidebar();
      const link = screen.getByRole('link', { name: 'v1.2.0' });
      expect(link).toHaveAttribute(
        'href',
        'https://github.com/guiooak/tymebox/releases/tag/v1.2.0',
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('title', 'Release notes on GitHub');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
