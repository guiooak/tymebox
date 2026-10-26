import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from './Logo';
import { TymeboxSymbol } from './TymeboxSymbol';

describe('Logo', () => {
  it('lays the wordmark beside or under the symbol', () => {
    const { container, rerender } = render(<Logo />);
    const logo = container.firstElementChild as HTMLElement;
    expect(logo.className).not.toMatch(/vertical/);
    expect(logo.style.getPropertyValue('--logo-h')).toBe('28px');
    rerender(<Logo layout="vertical" size={64} />);
    expect(logo.className).toMatch(/vertical/);
    expect(screen.getByText('Tymebox')).toBeInTheDocument();
  });
});

describe('TymeboxSymbol', () => {
  const paths = (container: HTMLElement) => container.querySelectorAll('path').length;

  it('draws the reduced symbol small and the full one large, unless told', () => {
    const small = render(<TymeboxSymbol size={24} />).container;
    const large = render(<TymeboxSymbol size={64} />).container;
    const forced = render(<TymeboxSymbol size={24} variant="full" />).container;
    expect(paths(small)).not.toBe(paths(large));
    expect(paths(forced)).toBe(paths(large));
  });

  it('is decorative without a title and an image with one', () => {
    const { container } = render(<TymeboxSymbol size={24} />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    render(<TymeboxSymbol size={24} title="Tymebox" />);
    expect(screen.getByRole('img', { name: 'Tymebox' })).toBeInTheDocument();
  });
});
