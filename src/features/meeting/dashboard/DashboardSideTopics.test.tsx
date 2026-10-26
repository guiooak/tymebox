import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeSideTopic } from '../../../test/fixtures';
import { renderWithApp } from '../../../test/render';
import { DashboardSideTopics } from './DashboardSideTopics';

function lot(props: Partial<Parameters<typeof DashboardSideTopics>[0]> = {}) {
  const handlers = { onAdd: vi.fn(), onUpdate: vi.fn(), onRemove: vi.fn() };
  renderWithApp(<DashboardSideTopics items={[]} {...handlers} {...props} />);
  return handlers;
}

describe('DashboardSideTopics', () => {
  it('is empty at first, with a button to park a topic', () => {
    const { onAdd } = lot();
    expect(screen.getByText('Nothing parked yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+ Add side topic' }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('numbers the topics, tags the milestone they came from, and focuses a new one', () => {
    lot({
      items: [
        makeSideTopic({ key: 'k1', value: 'Budget', goalName: 'Review last week' }),
        makeSideTopic({ id: 't2', key: 'k2', value: '' }),
      ],
      focusKey: 'k2',
    });
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('during “Review last week”')).toBeInTheDocument();
    const fields = screen.getAllByRole('textbox');
    expect(fields[0]).toHaveValue('Budget');
    expect(fields[1]).toHaveFocus();
  });

  it('saves edits, and drops a topic left empty', () => {
    const { onUpdate, onRemove } = lot({
      items: [makeSideTopic({ key: 'k1', value: 'Budget' })],
    });
    const field = screen.getByRole('textbox');
    fireEvent.change(field, { target: { value: 'Budget Q3' } });
    expect(onUpdate).toHaveBeenCalledWith('k1', 'Budget Q3');
    fireEvent.blur(field, { target: { value: 'Budget' } });
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.blur(field, { target: { value: '  ' } });
    expect(onRemove).toHaveBeenCalledWith('k1');
  });

  it('deletes an empty topic at once, and asks before deleting a written one', async () => {
    const { onRemove } = lot({
      items: [
        makeSideTopic({ key: 'k1', value: '' }),
        makeSideTopic({ id: 't2', key: 'k2', value: 'Keep me?' }),
      ],
    });
    const [deleteEmpty, deleteWritten] = screen.getAllByRole('button', {
      name: 'Delete topic',
    });
    fireEvent.click(deleteEmpty);
    expect(onRemove).toHaveBeenCalledWith('k1');

    fireEvent.click(deleteWritten);
    fireEvent.click(await screen.findByRole('button', { name: 'Not anymore' }));
    await act(async () => {});
    expect(onRemove).toHaveBeenCalledTimes(1);

    fireEvent.click(deleteWritten);
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, do it' }));
    await act(async () => {});
    expect(onRemove).toHaveBeenLastCalledWith('k2');
  });

  it('ignores topics that have no key yet', () => {
    const { onUpdate, onRemove } = lot({ items: [makeSideTopic({ key: undefined })] });
    const field = screen.getByRole('textbox');
    fireEvent.change(field, { target: { value: 'x' } });
    fireEvent.blur(field, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete topic' }));
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('is read-only for viewers', () => {
    lot({ items: [makeSideTopic({ key: 'k1' })], readOnly: true });
    expect(screen.queryByRole('button', { name: '+ Add side topic' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete topic' })).toBeNull();
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });
});
