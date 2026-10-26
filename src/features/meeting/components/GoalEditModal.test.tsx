import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeGoal } from '../../../test/fixtures';
import { renderWithApp } from '../../../test/render';
import type { Goal } from '../domain/types';
import { GoalEditModal } from './GoalEditModal';

function edit(goal: Goal | null) {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const view = renderWithApp(
    <GoalEditModal goal={goal} onClose={onClose} onSave={onSave} />,
  );
  return { ...view, onClose, onSave };
}

describe('GoalEditModal', () => {
  it('is closed with no milestone', () => {
    edit(null);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('saves a weight, refusing anything that isn’t a positive number', () => {
    const { onSave, onClose } = edit(makeGoal({ weight: 2 }));
    const weight = screen.getByRole('spinbutton', { name: 'Weight' });
    expect(weight).toHaveValue(2);
    expect(
      screen.getByText('Empty means this milestone is still open.'),
    ).toBeInTheDocument();

    for (const bad of ['', '0', '-1']) {
      fireEvent.change(weight, { target: { value: bad } });
      expect(screen.getByText('Weight must be a positive number')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    }
    fireEvent.change(weight, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ finishedAt: '', weight: 3 });
    expect(onClose).toHaveBeenCalled();
  });

  it('corrects or clears when a milestone was done', () => {
    const { onSave } = edit(makeGoal({ finishedAt: '2026-01-01T10:10:00.000Z' }));
    expect(screen.getByText(/Correcting this moves the point/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark as not done' }));
    expect(
      screen.getByText('Empty means this milestone is still open.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ finishedAt: '', weight: 1 });
  });

  it('shows the fields of whichever milestone is opened next', () => {
    const { rerender, onClose } = edit(makeGoal({ weight: 2 }));
    rerender(
      <GoalEditModal
        goal={makeGoal({ id: 'g2', name: 'Two', weight: 5 })}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Edit “Two”' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Weight' })).toHaveValue(5);
    rerender(<GoalEditModal goal={null} onClose={onClose} onSave={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cancels', () => {
    const { onClose, onSave } = edit(makeGoal());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
