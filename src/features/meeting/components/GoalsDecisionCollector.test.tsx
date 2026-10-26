import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach } from 'vitest';
import { renderWithApp } from '../../../test/render';
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

/* ---------- The rest of the list ---------- */

function list(props: Partial<Parameters<typeof GoalsDecisionCollector>[0]> = {}) {
  const handlers = {
    onToggleAutomatic: vi.fn(),
    onChangeGoal: vi.fn(),
    onAllCompleted: vi.fn(),
    onAddGoal: vi.fn(),
    onRemoveGoal: vi.fn(),
    onDuplicateGoal: vi.fn(),
    onReorderGoals: vi.fn(),
    onConfirmRemove: vi.fn(async () => true),
  };
  renderWithApp(
    <GoalsDecisionCollector goals={goals} editable automatic {...handlers} {...props} />,
  );
  return handlers;
}

const checkbox = (name: string) =>
  within(rowOf(name)).getByRole('checkbox', { name: 'Done' }) as HTMLInputElement;
const rowOf = (name: string) =>
  screen
    .getByRole('button', { name: `Toggle ${name}` })
    .closest('[draggable]') as HTMLElement;
const notesOf = (id: string) =>
  document.querySelector(`textarea[name="decisions-${id}"]`) as HTMLTextAreaElement;
const openMenu = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name: `Actions for ${name}` }));

describe('GoalsDecisionCollector', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the first open milestone, with a hint when the list is empty', () => {
    list({ goals: [] });
    expect(screen.getByText('No milestones yet')).toBeInTheDocument();
  });

  it('starts with the first unfinished milestone open', () => {
    list({ goals: [{ ...goals[0], finishedAt: '2026-01-01T10:00:00Z' }, goals[1]] });
    expect(
      screen.getByRole('button', { name: 'Toggle Pick priorities' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: 'Toggle Review last week' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('checks one off, celebrates briefly, and moves on to the next one in automatic mode', () => {
    vi.useFakeTimers();
    const { onChangeGoal, onAllCompleted } = list();
    fireEvent.click(checkbox('Review last week'));
    expect(onChangeGoal).toHaveBeenCalledWith('g1', { finishedAt: expect.any(String) });
    expect(rowOf('Review last week').className).toMatch(/celebrate/);
    expect(
      screen.getByRole('button', { name: 'Toggle Pick priorities' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(notesOf('g2')).toHaveFocus();
    act(() => vi.advanceTimersByTime(700));
    expect(rowOf('Review last week').className).not.toMatch(/celebrate/);
    expect(onAllCompleted).not.toHaveBeenCalled();
  });

  it('stays put when checking off outside automatic mode, and reopens one unchecked', () => {
    const done = [
      { ...goals[0], finishedAt: '2026-01-01T10:00:00Z' },
      goals[1],
      goals[2],
    ];
    const { onChangeGoal } = list({ goals: done, automatic: false });
    fireEvent.click(checkbox('Pick priorities'));
    expect(
      screen.getByRole('button', { name: 'Toggle Pick priorities' }),
    ).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(checkbox('Review last week'));
    expect(onChangeGoal).toHaveBeenLastCalledWith('g1', { finishedAt: '' });
    expect(
      screen.getByRole('button', { name: 'Toggle Review last week' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('says when the last one is done, closing every row', () => {
    const almost = [
      { ...goals[0], finishedAt: '2026-01-01T10:00:00Z' },
      { ...goals[1], finishedAt: '2026-01-01T10:10:00Z' },
      goals[2],
    ];
    const { onAllCompleted } = list({ goals: almost });
    fireEvent.click(checkbox('Assign owners'));
    expect(onAllCompleted).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Toggle Assign owners' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('opens and closes every row at once, and one by one', () => {
    list();
    fireEvent.click(screen.getByRole('button', { name: 'Open all' }));
    expect(screen.getByRole('button', { name: 'Toggle Assign owners' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Review last week' }));
    expect(
      screen.getByRole('button', { name: 'Toggle Review last week' }),
    ).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Assign owners' }));
    expect(notesOf('g3')).toHaveFocus();
  });

  it('switches automatic mode', () => {
    const { onToggleAutomatic } = list();
    fireEvent.click(screen.getByRole('switch', { name: 'Automatic mode' }));
    expect(onToggleAutomatic).toHaveBeenCalledWith(false);
  });

  it('renames a milestone, ignoring an empty name, and saves notes', () => {
    const { onChangeGoal } = list();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit milestone name' })[0]);
    const name = screen.getByRole('textbox', { name: 'milestone name' });
    fireEvent.change(name, { target: { value: 'Retro' } });
    fireEvent.keyDown(name, { key: 'Enter' });
    expect(onChangeGoal).toHaveBeenCalledWith('g1', { name: 'Retro' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit milestone name' })[0]);
    fireEvent.change(screen.getByRole('textbox', { name: 'milestone name' }), {
      target: { value: '' },
    });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'milestone name' }), {
      key: 'Enter',
    });
    expect(onChangeGoal).toHaveBeenCalledTimes(1);

    fireEvent.change(notesOf('g1'), { target: { value: 'Decided X' } });
    expect(onChangeGoal).toHaveBeenLastCalledWith('g1', { decisions: 'Decided X' });
  });

  it('shows when a milestone was done and its weight', () => {
    list({
      goals: [{ ...goals[0], finishedAt: '2026-01-01T10:00:00Z', weight: 3 }],
    });
    expect(screen.getByText(/^done at /)).toBeInTheDocument();
    expect(screen.getByText('×3')).toBeInTheDocument();
  });

  it('adds milestones one after another, and stops on Escape, an empty name or Cancel', () => {
    const { onAddGoal } = list();
    fireEvent.click(screen.getByRole('button', { name: '+ Add milestone' }));
    const input = screen.getByRole('textbox', { name: 'New milestone name' });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'Risks' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAddGoal).toHaveBeenCalledWith('Risks');
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: 'Owners' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAddGoal).toHaveBeenLastCalledWith('Owners');

    fireEvent.keyDown(input, { key: 'x' });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('textbox', { name: 'New milestone name' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '+ Add milestone' }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'New milestone name' }), {
      key: 'Enter',
    });
    expect(screen.queryByRole('textbox', { name: 'New milestone name' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '+ Add milestone' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('textbox', { name: 'New milestone name' })).toBeNull();
    expect(onAddGoal).toHaveBeenCalledTimes(2);
  });

  it('duplicates and moves from the ⋮ menu, the ends disabled', () => {
    const { onDuplicateGoal, onReorderGoals } = list();
    openMenu('Review last week');
    expect(screen.getByRole('menuitem', { name: 'Move up' })).toBeDisabled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    expect(onDuplicateGoal).toHaveBeenCalledWith('g1');

    openMenu('Review last week');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move down' }));
    expect(onReorderGoals).toHaveBeenCalledWith(0, 1);

    openMenu('Assign owners');
    expect(screen.getByRole('menuitem', { name: 'Move down' })).toBeDisabled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move up' }));
    expect(onReorderGoals).toHaveBeenLastCalledWith(2, 1);
  });

  it('deletes a blank milestone at once, and asks first when it has notes or is done', async () => {
    const withNotes = [goals[0], { ...goals[1], decisions: 'Keep?' }, goals[2]];
    const handlers = list({ goals: withNotes });
    openMenu('Review last week');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await act(async () => {});
    expect(handlers.onConfirmRemove).not.toHaveBeenCalled();
    expect(handlers.onRemoveGoal).toHaveBeenCalledWith('g1');

    handlers.onConfirmRemove.mockResolvedValueOnce(false);
    openMenu('Pick priorities');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await act(async () => {});
    expect(handlers.onConfirmRemove).toHaveBeenCalledWith(withNotes[1]);
    expect(handlers.onRemoveGoal).toHaveBeenCalledTimes(1);

    openMenu('Pick priorities');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await act(async () => {});
    expect(handlers.onRemoveGoal).toHaveBeenLastCalledWith('g2');
  });

  it('deletes without asking when nobody is there to confirm', async () => {
    const { onRemoveGoal } = list({
      goals: [{ ...goals[0], finishedAt: '2026-01-01T10:00:00Z' }],
      onConfirmRemove: undefined,
    });
    openMenu('Review last week');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await act(async () => {});
    expect(onRemoveGoal).toHaveBeenCalledWith('g1');
  });

  it('edits when and how much from the ⋮ menu', () => {
    const { onChangeGoal } = list();
    openMenu('Pick priorities');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit “Pick priorities”' });
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Weight' }), {
      target: { value: '2' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onChangeGoal).toHaveBeenCalledWith('g2', { finishedAt: '', weight: 2 });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  const dataTransfer = { setDragImage: vi.fn(), effectAllowed: '' };

  it('reorders by dragging a row by its handle onto another', () => {
    vi.useFakeTimers();
    const { onReorderGoals } = list();
    // The drag ghost is removed on the next tick, as in the browser.
    const dragStart = (row: HTMLElement) => {
      fireEvent.dragStart(row, { dataTransfer });
      act(() => vi.runAllTimers());
    };
    const handle = within(rowOf('Review last week')).getByTitle('Drag to reorder');
    fireEvent.mouseDown(handle);
    expect(rowOf('Review last week')).toHaveAttribute('draggable', 'true');
    fireEvent.mouseUp(handle);
    expect(rowOf('Review last week')).toHaveAttribute('draggable', 'false');

    // A drag that never started is ignored.
    fireEvent.dragOver(rowOf('Assign owners'));
    dragStart(rowOf('Review last week'));
    fireEvent.dragOver(rowOf('Assign owners'));
    expect(rowOf('Assign owners').className).toMatch(/dropTarget/);
    fireEvent.drop(rowOf('Assign owners'));
    expect(onReorderGoals).toHaveBeenCalledWith(0, 2);

    // Dropping a row on itself, or ending the drag, changes nothing.
    dragStart(rowOf('Pick priorities'));
    fireEvent.drop(rowOf('Pick priorities'));
    dragStart(rowOf('Pick priorities'));
    fireEvent.dragEnd(rowOf('Pick priorities'));
    fireEvent.drop(rowOf('Assign owners'));
    expect(onReorderGoals).toHaveBeenCalledTimes(1);
  });

  it('is read-only for viewers, and closed to ticking before the event starts', () => {
    list({ editable: false, disabled: true });
    expect(screen.queryByRole('button', { name: '+ Add milestone' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Actions for/ })).toBeNull();
    expect(screen.queryByTitle('Drag to reorder')).toBeNull();
    expect(checkbox('Review last week')).toBeDisabled();
    expect(notesOf('g1')).toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Pick priorities' }));
    expect(notesOf('g2')).not.toHaveFocus();
  });

  it('lets an editor write notes before the event starts', () => {
    list({ disabled: true });
    expect(notesOf('g1')).not.toHaveAttribute('readonly');
  });
});
