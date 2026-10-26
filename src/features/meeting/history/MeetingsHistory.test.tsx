import { act, fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  makeFinishedMeeting,
  makeLiveMeeting,
  makeMeeting,
} from '../../../test/fixtures';
import { renderWithApp, type RenderOptions } from '../../../test/render';
import { MeetingsHistory } from './MeetingsHistory';

const events = [
  makeMeeting({
    id: 'draft',
    name: 'Budget draft',
    description: 'Q3 numbers',
    createdAt: '2026-01-05T09:00:00.000Z',
  }),
  makeLiveMeeting({
    id: 'live',
    name: 'Standup',
    realStartTime: '2026-01-04T10:00:00.000Z',
  }),
  makeFinishedMeeting({ id: 'done', name: 'Retro' }),
  makeMeeting({
    id: 'cancelled',
    name: 'All-hands',
    status: 'cancelled',
    expectedStartTime: '',
    expectedEndTime: '',
    createdAt: '',
  }),
  makeMeeting({
    id: 'blank',
    name: '',
    expectedStartTime: '',
    expectedEndTime: '',
    createdAt: '2025-12-01T09:00:00.000Z',
  }),
];

function history(store: RenderOptions['store'] = {}) {
  const actions = {
    reopen: vi.fn(async () => {}),
    reopenInDashboard: vi.fn(async () => {}),
    clone: vi.fn(async () => 'copy'),
    deleteEvent: vi.fn(async () => {}),
  };
  const view = renderWithApp(<MeetingsHistory />, {
    store: { ...actions, loading: false, meetings: events, ...store },
  });
  return { ...view, ...actions };
}

const names = () =>
  screen
    .queryAllByRole('button', {
      name: /^(Budget draft|Standup|Retro|All-hands|Untitled event)$/,
    })
    .map((item) => item.textContent);

describe('MeetingsHistory', () => {
  it('waits for the events', () => {
    history({ loading: true });
    expect(screen.getByText('Loading your events…')).toBeInTheDocument();
  });

  it('says so when there are no events', () => {
    history({ meetings: [] });
    expect(screen.getByText('No events yet')).toBeInTheDocument();
  });

  it('counts the events per status and filters by it', () => {
    history();
    const tabs = screen.getByRole('tablist', { name: 'Filter by status' });
    expect(within(tabs).getByRole('tab', { name: 'All5' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.click(within(tabs).getByRole('tab', { name: 'Finished1' }));
    expect(names()).toEqual(['Retro']);
    fireEvent.click(within(tabs).getByRole('tab', { name: 'Drafts2' }));
    expect(names()).toHaveLength(2);
  });

  it('searches names and descriptions, and says when nothing matches', () => {
    history();
    const search = screen.getByRole('searchbox', { name: 'Search events' });
    fireEvent.change(search, { target: { value: 'q3' } });
    expect(names()).toEqual(['Budget draft']);
    fireEvent.change(search, { target: { value: 'nothing like this' } });
    expect(screen.getByText('Nothing matches those filters')).toBeInTheDocument();
  });

  it('sorts newest first, oldest first or by name', () => {
    history();
    expect(names()[0]).toBe('Budget draft');
    fireEvent.click(screen.getByRole('combobox', { name: 'Sort events' }));
    fireEvent.click(screen.getByRole('option', { name: 'Oldest first' }));
    expect(names()[0]).toBe('All-hands');
    fireEvent.click(screen.getByRole('combobox', { name: 'Sort events' }));
    fireEvent.click(screen.getByRole('option', { name: 'Name (A–Z)' }));
    expect(names()).toEqual([
      'Untitled event',
      'All-hands',
      'Budget draft',
      'Retro',
      'Standup',
    ]);
  });

  it('describes each event: status, outcome, when and how long', () => {
    history();
    const retro = screen
      .getByRole('button', { name: 'Retro' })
      .closest('[class*="item"]') as HTMLElement;
    expect(within(retro).getByText('Finished')).toBeInTheDocument();
    expect(within(retro).getByText('17% under budget')).toBeInTheDocument();
    expect(within(retro).getByText(/2 milestones · 50m 00s$/)).toBeInTheDocument();
    const cancelled = screen
      .getByRole('button', { name: 'All-hands' })
      .closest('[class*="item"]') as HTMLElement;
    expect(
      within(cancelled).getByText(/^Not scheduled · 2 milestones$/),
    ).toBeInTheDocument();
  });

  it('opens an event on its report when finished, otherwise on its board', async () => {
    const { reopen, path } = history();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retro' }));
    });
    expect(reopen).toHaveBeenCalledWith('done');
    expect(path()).toBe('/events/done/report');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Standup' }));
    });
    expect(path()).toBe('/events/live');
  });

  it('offers the right board action for each kind of event', async () => {
    const { reopen, reopenInDashboard, path } = history();
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Retro' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'View report' }));
    });
    expect(reopen).toHaveBeenCalledWith('done');
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Retro' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Reopen event' }));
    });
    expect(reopenInDashboard).toHaveBeenCalledWith('done');
    expect(path()).toBe('/events/done');

    fireEvent.click(screen.getByRole('button', { name: 'Actions for All-hands' }));
    expect(screen.getByRole('menuitem', { name: 'Run again' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'View report' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Actions for this event' }));
    expect(screen.getByRole('menuitem', { name: 'Open board' })).toBeInTheDocument();
  });

  it('clones, staying put if the copy couldn’t be made, and deletes after confirming', async () => {
    const { clone, path } = history();
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Standup' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Clone' }));
    });
    expect(clone).toHaveBeenCalledWith('live');
    expect(path()).toBe('/events/copy');

    clone.mockResolvedValueOnce(null as unknown as string);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Standup' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Clone' }));
    });
    expect(path()).toBe('/events/copy');

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Standup' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete event' }));
    expect(
      await screen.findByRole('dialog', { name: 'Delete this event?' }),
    ).toBeInTheDocument();
  });

  it('plans a new event', () => {
    const { path } = history();
    fireEvent.click(screen.getByRole('button', { name: '+ New event' }));
    expect(path()).toBe('/events/new');
  });
});
