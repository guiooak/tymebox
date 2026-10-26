import { act, render, screen } from '@testing-library/react';
import { makeLiveMeeting, makeViewer } from '../../../test/fixtures';
import { renderWithApp, type RenderOptions } from '../../../test/render';
import { MemoryRouter } from 'react-router-dom';
import { Route, Routes } from '../../../common/services/router';
import { useMeetingStore } from '../store';
import { EventGate } from './EventGate';

describe('EventGate', () => {
  const initial = useMeetingStore.getState();
  afterEach(() => useMeetingStore.setState(initial, true));

  it('opens the event once the store has a user, as on a fresh page load', () => {
    const close = vi.fn();
    const openEvent = vi.fn(() => close);
    useMeetingStore.setState({ user: null, openEvent });

    render(
      <MemoryRouter initialEntries={['/events/abc/report']}>
        <Routes>
          <Route
            path="/events/:id/report"
            element={<EventGate>{(event) => event.name}</EventGate>}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(openEvent).not.toHaveBeenCalled();

    // AppShell binds the signed-in user after the page's own effects ran.
    act(() =>
      useMeetingStore.setState({
        user: { uid: 'u1', email: 'a@b.co', name: 'A', photoURL: '' },
      }),
    );
    expect(openEvent).toHaveBeenCalledWith('abc');
  });
});

describe('EventGate states', () => {
  const event = makeLiveMeeting();
  const gate = (route: string, store: RenderOptions['store']) =>
    renderWithApp(<EventGate>{(open, role) => `${open.name} as ${role}`}</EventGate>, {
      route,
      path: route === '/' ? '/' : '/events/:id',
      store: { openEvent: () => () => {}, user: makeViewer(), ...store },
    });

  it('goes Home without an event id in the URL', () => {
    const { path } = gate('/', {});
    expect(path()).toBe('/');
  });

  it('waits while the event opens or its role is settling', () => {
    const { unmount } = gate('/events/m1', { openId: 'other', eventView: 'ready' });
    expect(screen.getByRole('status')).toBeInTheDocument();
    unmount();
    const loading = gate('/events/m1', { openId: 'm1', eventView: 'loading' });
    expect(screen.getByRole('status')).toBeInTheDocument();
    loading.unmount();
    gate('/events/m1', { openId: 'm1', eventView: 'ready', event, role: null });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the request page when access is denied', () => {
    gate('/events/m1', { openId: 'm1', eventView: 'denied', access: null });
    expect(
      screen.getByRole('heading', { name: /don’t have access/ }),
    ).toBeInTheDocument();
  });

  it('shows the page once the event and your role are known', () => {
    gate('/events/m1', { openId: 'm1', eventView: 'ready', event, role: 'viewer' });
    expect(screen.getByText('Weekly planning as viewer')).toBeInTheDocument();
  });
});
