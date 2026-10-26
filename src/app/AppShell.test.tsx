import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

// Keep Firebase out: the shell only needs the auth state.
vi.mock('../common/services/auth', () => ({
  observeAuth: vi.fn(() => () => {}),
  signInWithGoogle: vi.fn(async () => {}),
  signInAsTestUser: vi.fn(async () => {}),
  signOutUser: vi.fn(async () => {}),
}));

const { useAuthStore } = await import('../features/auth');
const { useMeetingStore } = await import('../features/meeting/store');
const { useI18nStore } = await import('../common/services/i18n');
const { DialogProvider } = await import('../common/components');
const { AppShell } = await import('./AppShell');
const { setViewport } = await import('../test/render');

function CurrentPath() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

const path = () => screen.getByTestId('path').textContent;

function renderAt(url: string) {
  return render(
    <DialogProvider>
      <MemoryRouter initialEntries={[url]}>
        <AppShell />
        <CurrentPath />
      </MemoryRouter>
    </DialogProvider>,
  );
}

describe('landing URLs', () => {
  beforeEach(() => {
    setViewport('desktop');
    useAuthStore.setState({ status: 'unauthenticated', user: null });
    useMeetingStore.setState({ bind: () => () => {} });
  });
  afterEach(() => useI18nStore.getState().setLocale('en-US'));

  it('sends a signed-out visitor from / to the landing in their language', () => {
    const { unmount } = renderAt('/');
    expect(path()).toBe('/en');
    unmount();

    useI18nStore.getState().setLocale('pt-BR');
    renderAt('/');
    expect(path()).toBe('/pt');
  });

  it('opens /pt in Portuguese and remembers it', () => {
    renderAt('/pt');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Cada evento, na sua caixa.',
    );
    expect(useI18nStore.getState().locale).toBe('pt-BR');
    expect(localStorage.getItem('tw-locale')).toBe('pt-BR');
  });

  it('lets the legal pages name the tab themselves', () => {
    renderAt('/privacy');
    expect(document.title).not.toBe('Tymebox — Timebox your events');
    expect(document.title).toMatch(/Privacy/);
  });

  it('takes a signed-in user from /pt to Home', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: { uid: 'u1', email: 'a@b.co', displayName: 'Ana', photoURL: null },
    });
    renderAt('/pt');
    expect(path()).toBe('/');
  });

  it('gives phones a bottom tab bar and an account menu instead of the sidebar', () => {
    setViewport('phone');
    useAuthStore.setState({
      status: 'authenticated',
      user: { uid: 'u1', email: 'a@b.co', displayName: 'Ana', photoURL: null },
    });
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav).toHaveTextContent('Home');
    expect(nav).toHaveTextContent('New');
    expect(nav).toHaveTextContent('History');
    expect(screen.getByRole('button', { name: 'Open account menu' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Collapse menu/ })).toBeNull();
  });
});

describe('signed-in redirects', () => {
  beforeEach(() => {
    setViewport('desktop');
    useAuthStore.setState({
      status: 'authenticated',
      user: { uid: 'u1', email: 'a@b.co', displayName: 'Ana', photoURL: null },
    });
    useMeetingStore.setState({ bind: () => () => {}, loading: false });
  });

  it('takes a user who just signed in back where they were headed', () => {
    renderAt('/login');
    expect(path()).toBe('/');
  });

  it('waits for the events before opening the current one from an old URL', () => {
    useMeetingStore.setState({ loading: true });
    const { container } = renderAt('/events/live');
    expect(path()).toBe('/events/live');
    expect(container.querySelector('[class*="loading"]')).toBeInTheDocument();
  });

  it('opens the current event, or its report, from the old URLs', () => {
    useMeetingStore.setState({ currentMeetingId: 'abc', openEvent: () => () => {} });
    const live = renderAt('/meetings/live');
    expect(path()).toBe('/events/abc');
    live.unmount();
    renderAt('/events/report');
    expect(path()).toBe('/events/abc/report');
  });

  it('goes Home from an old URL when there is no current event', () => {
    useMeetingStore.setState({ currentMeetingId: null });
    renderAt('/events/live');
    expect(path()).toBe('/');
  });
});
