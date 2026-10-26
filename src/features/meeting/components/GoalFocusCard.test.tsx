import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeGoal } from '../../../test/fixtures';
import { renderWithApp } from '../../../test/render';
import { GoalFocusCard } from './GoalFocusCard';

describe('GoalFocusCard', () => {
  it('shows the milestone in progress, its notes, and closes it in one click', () => {
    const onComplete = vi.fn();
    renderWithApp(
      <GoalFocusCard
        goal={makeGoal({ name: 'Pick priorities', decisions: 'Ship the beta' })}
        position={2}
        total={3}
        onComplete={onComplete}
      />,
    );
    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Ship the beta')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark as done' }));
    expect(onComplete).toHaveBeenCalled();
  });

  it('hides empty notes and can be disabled', () => {
    renderWithApp(
      <GoalFocusCard
        goal={makeGoal({ decisions: '   ' })}
        position={1}
        total={1}
        disabled
        onComplete={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Mark as done' })).toBeDisabled();
    expect(screen.getByText('Review last week').nextElementSibling?.tagName).toBe(
      'BUTTON',
    );
  });

  it('celebrates when everything is closed', () => {
    renderWithApp(
      <GoalFocusCard goal={null} position={3} total={2} onComplete={vi.fn()} />,
    );
    expect(screen.getByText('All done')).toBeInTheDocument();
    expect(screen.getByText('Every milestone is closed. 🎉')).toBeInTheDocument();
  });
});
