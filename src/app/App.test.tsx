import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../features/auth';
import { App } from './App';

describe('App', () => {
  it('starts listening to the sign-in and waits for it', () => {
    const init = vi.fn();
    useAuthStore.setState({ init, status: 'loading' });
    const { container } = render(<App />);
    expect(init).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[class*="loading"]')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
