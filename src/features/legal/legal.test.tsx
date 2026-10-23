import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { en } from './content/en';
import { pt } from './content/pt';
import type { LegalDoc } from './content/types';

vi.mock('../../common/services/auth', () => ({
  observeAuth: vi.fn(() => () => {}),
  signInWithGoogle: vi.fn(),
  signOutUser: vi.fn(),
}));

const { useAuthStore } = await import('../auth');
const { LegalPage } = await import('./LegalPage');

const shape = (doc: LegalDoc) =>
  doc.sections.map((section) => ({
    id: section.id,
    blocks: section.blocks.map((block) =>
      typeof block === 'string' ? 'p' : 'list' in block ? 'list' : 'table',
    ),
  }));

describe('legal texts', () => {
  it('have the same sections, in the same order, in both languages', () => {
    expect(shape(en.privacy)).toEqual(shape(pt.privacy));
    expect(shape(en.terms)).toEqual(shape(pt.terms));
  });

  it('name the privacy contact in both policies', () => {
    for (const doc of [pt.privacy, en.privacy]) {
      expect(JSON.stringify(doc)).toContain('tymebox@gmail.com');
    }
  });
});

describe('LegalPage', () => {
  it('opens signed out, in the language of its URL, linking to the other one', () => {
    useAuthStore.setState({ status: 'unauthenticated', user: null });
    render(
      <MemoryRouter>
        <LegalPage doc="privacy" locale="pt-BR" />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Política de Privacidade' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read in English' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(document.title).toBe('Política de Privacidade · Tymebox');
  });

  it('shows the terms in English', () => {
    useAuthStore.setState({ status: 'authenticated', user: null });
    render(
      <MemoryRouter>
        <LegalPage doc="terms" locale="en-US" />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Terms of Use' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ler em português' })).toHaveAttribute(
      'href',
      '/termos',
    );
  });
});
