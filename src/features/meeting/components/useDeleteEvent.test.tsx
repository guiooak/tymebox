import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeMeeting } from '../../../test/fixtures';
import { renderWithApp } from '../../../test/render';
import type { Meeting } from '../domain/types';
import { useDeleteEvent } from './useDeleteEvent';

function DeleteButton({ meeting }: { meeting: Meeting }) {
  const onDelete = useDeleteEvent();
  return <button onClick={() => void onDelete(meeting)}>delete</button>;
}

describe('useDeleteEvent', () => {
  it('deletes only after confirming, naming the event', async () => {
    const deleteEvent = vi.fn(async () => {});
    renderWithApp(<DeleteButton meeting={makeMeeting()} />, { store: { deleteEvent } });
    fireEvent.click(screen.getByText('delete'));
    expect(await screen.findByText(/“Weekly planning”/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    await act(async () => {});
    expect(deleteEvent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('delete'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete event' }));
    await act(async () => {});
    expect(deleteEvent).toHaveBeenCalledWith('m1');
  });

  it('calls an unnamed event by a placeholder', async () => {
    renderWithApp(<DeleteButton meeting={makeMeeting({ name: '' })} />);
    fireEvent.click(screen.getByText('delete'));
    expect(await screen.findByText(/“Untitled event”/)).toBeInTheDocument();
  });
});
