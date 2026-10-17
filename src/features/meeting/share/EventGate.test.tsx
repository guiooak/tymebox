import { act, render } from '@testing-library/react';
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
