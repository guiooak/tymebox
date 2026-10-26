import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Keep Firebase out of the test: the page only needs the sign-in calls.
vi.mock('../../common/services/auth', () => ({
  observeAuth: vi.fn(() => () => {}),
  signInWithGoogle: vi.fn(async () => {}),
  signInAsTestUser: vi.fn(async () => {}),
  signOutUser: vi.fn(async () => {}),
}));

const { useAuthStore } = await import('../auth');
const { Landing } = await import('./Landing');

function renderAt(entry: string | { pathname: string; state: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Landing />
    </MemoryRouter>,
  );
}

describe('Landing', () => {
  const initial = useAuthStore.getState();
  afterEach(() => useAuthStore.setState(initial, true));

  it('says what Tymebox is and signs in with Google', () => {
    const signIn = vi.fn(async () => {});
    useAuthStore.setState({ signIn });
    renderAt('/');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Every event, inside its box.',
    );
    expect(screen.getByRole('heading', { name: 'Three steps, one box.' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Tymebox home' })).toHaveAttribute(
      'href',
      '/',
    );

    const buttons = screen.getAllByRole('button', { name: /Continue with Google/ });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    expect(signIn).toHaveBeenCalledOnce();
  });

  it('tells people sent from an event link to sign in to open it', () => {
    renderAt({ pathname: '/login', state: { from: '/events/abc' } });
    expect(screen.getByText('Sign in to open the event you were sent.')).toBeVisible();
  });

  it('shows a still frame of the demo when motion is reduced', () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      renderAt('/');
      // 16 minutes into the 30-minute box.
      expect(screen.getByText('14:00')).toBeInTheDocument();
      expect(screen.getByText('Now')).toBeInTheDocument();
    } finally {
      window.matchMedia = matchMedia;
    }
  });

  it('switches language through the profile, or through the URL on /pt and /en', async () => {
    const { renderWithApp } = await import('../../test/render');
    const { LocalizedLanding } = await import('./LocalizedLanding');
    const chooseLocale = vi.fn(async () => {});
    const plain = renderWithApp(<Landing />, { store: { chooseLocale } });
    fireEvent.click(screen.getByRole('combobox', { name: 'Language' }));
    fireEvent.click(screen.getByRole('option', { name: 'Português' }));
    expect(chooseLocale).toHaveBeenCalledWith('pt-BR');
    plain.unmount();

    const localized = renderWithApp(<LocalizedLanding locale="en-US" />, {
      route: '/en',
      path: '/en',
    });
    fireEvent.click(screen.getByRole('combobox', { name: 'Language' }));
    fireEvent.click(screen.getByRole('option', { name: 'Português' }));
    expect(localized.path()).toBe('/pt');
  });

  it('speaks Portuguese when that is the chosen language', async () => {
    const { useI18nStore } = await import('../../common/services/i18n');
    useI18nStore.getState().setLocale('pt-BR');
    try {
      renderAt('/');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Cada evento, na sua caixa.',
      );
      expect(
        screen.getAllByRole('button', { name: /Continuar com o Google/ }),
      ).toHaveLength(2);
      expect(screen.getByRole('combobox', { name: 'Idioma' })).toHaveTextContent('PT');
    } finally {
      useI18nStore.getState().setLocale('en-US');
    }
  });
});
