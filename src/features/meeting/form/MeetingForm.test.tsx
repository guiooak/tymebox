import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  makeFinishedMeeting,
  makeLiveMeeting,
  makeMeeting,
} from '../../../test/fixtures';
import { renderWithApp, type RenderOptions } from '../../../test/render';
import { useMeetingStore } from '../store';
import { MeetingForm } from './MeetingForm';

function form(store: RenderOptions['store'] = {}) {
  const saveDraft = vi.fn(async () => 'new-id' as string | null);
  const discardCurrent = vi.fn(async () => {});
  const view = renderWithApp(<MeetingForm />, {
    route: '/events/new',
    path: '/events/new',
    store: { saveDraft, discardCurrent, currentMeeting: null, ...store },
  });
  return { ...view, saveDraft, discardCurrent };
}

const nameField = () => screen.getByLabelText('Event name');
const descriptionField = () => screen.getByLabelText('Description');

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create event' }));
  });
}

describe('MeetingForm', () => {
  it('asks for a name before saving', async () => {
    const { saveDraft } = form();
    expect(screen.queryByText('Event name is required')).toBeNull();
    fireEvent.change(nameField(), { target: { value: '   ' } });
    await submit();
    expect(screen.getByText('Event name is required')).toBeInTheDocument();
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('saves the draft, trimmed, and opens its board', async () => {
    const { saveDraft, path } = form();
    fireEvent.change(nameField(), { target: { value: '  Planning  ' } });
    fireEvent.change(descriptionField(), { target: { value: 'Q3' } });
    await submit();
    expect(saveDraft).toHaveBeenCalledWith({ name: 'Planning', description: 'Q3' });
    expect(path()).toBe('/events/new-id');
  });

  it('stays put when the draft couldn’t be saved', async () => {
    const { saveDraft, path } = form();
    saveDraft.mockResolvedValueOnce(null);
    fireEvent.change(nameField(), { target: { value: 'Planning' } });
    await submit();
    expect(path()).toBe('/events/new');
  });

  it('picks up a saved draft once, without overwriting what is typed after', () => {
    form({ currentMeeting: makeMeeting({ name: 'Draft', description: 'Notes' }) });
    expect(nameField()).toHaveValue('Draft');
    expect(descriptionField()).toHaveValue('Notes');
    fireEvent.change(nameField(), { target: { value: 'Renamed' } });
    act(() => {
      useMeetingStore.setState({ currentMeeting: makeMeeting({ name: 'Other' }) });
    });
    expect(nameField()).toHaveValue('Renamed');
  });

  it('lets go of a finished event and starts empty', () => {
    const { discardCurrent } = form({ currentMeeting: makeFinishedMeeting() });
    expect(discardCurrent).toHaveBeenCalled();
    expect(nameField()).toHaveValue('');
  });

  it('sends a running event back to its board', () => {
    const { path } = form({ currentMeeting: makeLiveMeeting({ id: 'live' }) });
    expect(path()).toBe('/events/live');
  });

  it('clears the form and the error', async () => {
    const { discardCurrent } = form({ currentMeeting: makeMeeting({ name: 'Draft' }) });
    fireEvent.change(nameField(), { target: { value: '' } });
    await submit();
    expect(screen.getByText('Event name is required')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clean form' }));
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Yes, do it' }));
    });
    expect(discardCurrent).toHaveBeenCalled();
    expect(nameField()).toHaveValue('');
    expect(descriptionField()).toHaveValue('');
    expect(screen.queryByText('Event name is required')).toBeNull();
  });
});
