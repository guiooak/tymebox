import { fireEvent, render, screen } from '@testing-library/react';
import { DialogProvider } from '../../../common/components';
import type { Goal } from '../domain/types';
import { GoalsDecisionCollector } from './GoalsDecisionCollector';

const goals: Goal[] = [
  { id: 'g1', name: 'Review last week', weight: 1, finishedAt: '', decisions: '' },
  { id: 'g2', name: 'Pick priorities', weight: 1, finishedAt: '', decisions: '' },
  { id: 'g3', name: 'Assign owners', weight: 1, finishedAt: '', decisions: '' },
];

describe('GoalsDecisionCollector drag', () => {
  it('drags a picture of the dragged milestone only', () => {
    render(
      <DialogProvider>
        <GoalsDecisionCollector
          goals={goals}
          editable
          automatic
          onToggleAutomatic={() => {}}
          onChangeGoal={() => {}}
          onAllCompleted={() => {}}
          onReorderGoals={() => {}}
        />
      </DialogProvider>,
    );
    let image: Element | null = null;
    const dataTransfer = {
      setDragImage: vi.fn((element: Element) => {
        image = element;
      }),
      effectAllowed: '',
    };
    const row = screen
      .getByRole('button', { name: 'Toggle Pick priorities' })
      .closest('[draggable]');
    fireEvent.dragStart(row as Element, { dataTransfer, clientX: 10, clientY: 10 });

    expect(dataTransfer.setDragImage).toHaveBeenCalledOnce();
    expect(image).not.toBe(row);
    expect(image).toHaveTextContent('Pick priorities');
    expect(image).not.toHaveTextContent('Review last week');
    expect(image).not.toHaveTextContent('Assign owners');
  });
});
