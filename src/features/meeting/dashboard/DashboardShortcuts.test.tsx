import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithApp } from '../../../test/render';
import { DashboardShortcuts } from './DashboardShortcuts';

describe('DashboardShortcuts', () => {
  it('runs a shortcut on its key, and lists them all in the help', () => {
    const done = vi.fn();
    renderWithApp(
      <DashboardShortcuts
        shortcuts={[
          {
            key: 'd',
            description: 'Mark the current milestone as done',
            onTrigger: done,
          },
        ]}
      />,
    );
    fireEvent.keyDown(document, { key: 'D' });
    expect(done).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: '?' });
    expect(
      screen.getByRole('dialog', { name: 'Keyboard shortcuts' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Mark the current milestone as done')).toBeInTheDocument();
    expect(screen.getByText('Show this help')).toBeInTheDocument();

    // Shortcuts pause while the help is open.
    fireEvent.keyDown(document, { key: 'd' });
    expect(done).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the help from its button, and closes it from the overlay', () => {
    renderWithApp(<DashboardShortcuts shortcuts={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts (?)' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
