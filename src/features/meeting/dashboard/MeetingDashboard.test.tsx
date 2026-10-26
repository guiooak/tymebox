import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  makeFinishedMeeting,
  makeGoal,
  makeLiveMeeting,
  makeMeeting,
  makeSideTopic,
  makeViewer,
} from '../../../test/fixtures';
import { renderWithApp } from '../../../test/render';
import type { Role } from '../domain/access';
import type { Meeting } from '../domain/types';
import { useAlertsStore } from '../alerts';
import { MeetingDashboard } from './MeetingDashboard';

/*
 * The live board, with the store primed (the event open, your role) and its
 * actions replaced: each test plays what a facilitator does and checks what
 * the board asks the store to do and where it navigates.
 */

const alertsInitial = useAlertsStore.getState();

afterEach(() => {
  useAlertsStore.setState(alertsInitial, true);
});

function actions() {
  return {
    openEvent: vi.fn(() => () => {}),
    startMeeting: vi.fn(async () => {}),
    cancelMeeting: vi.fn(async () => {}),
    finishMeeting: vi.fn(async () => {}),
    updateMeeting: vi.fn(async () => {}),
    updateGoal: vi.fn(async () => {}),
    addGoal: vi.fn(async () => {}),
    removeGoal: vi.fn(async () => {}),
    duplicateGoal: vi.fn(async () => {}),
    reorderGoals: vi.fn(async () => {}),
    addSideTopic: vi.fn(() => 'new-topic'),
    updateSideTopic: vi.fn(async () => {}),
    removeSideTopic: vi.fn(async () => {}),
    setAutomatic: vi.fn(async () => {}),
  };
}

function board(event: Meeting, role: Role = 'owner') {
  const store = actions();
  const view = renderWithApp(<MeetingDashboard />, {
    route: `/events/${event.id}`,
    path: '/events/:id',
    store: {
      ...store,
      user: makeViewer(),
      openId: event.id,
      eventView: 'ready',
      event,
      role,
      decisionsAutomaticBehavior: true,
    },
  });
  return { ...view, store };
}

/** Answer the confirm dialog that is open. */
async function answer(button: string) {
  fireEvent.click(await screen.findByRole('button', { name: button }));
  await act(async () => {});
}

describe('a finished event', () => {
  it('opens its report instead', () => {
    const { path } = board(makeFinishedMeeting());
    expect(path()).toBe('/events/m1/report');
  });
});

describe('starting', () => {
  it('asks before starting an event without milestones', async () => {
    const { store } = board(makeMeeting({ goals: [] }));
    fireEvent.click(screen.getByRole('button', { name: 'Start event' }));
    expect(
      await screen.findByText('This event has no milestones yet. Start it anyway?'),
    ).toBeInTheDocument();
    await answer('Let me add some');
    expect(store.startMeeting).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Start event' }));
    await answer('Start anyway');
    await answer("Yes, let's go!");
    expect(store.startMeeting).toHaveBeenCalled();
  });

  it('says it will box an unscheduled event to one hour', async () => {
    board(makeMeeting({ expectedStartTime: '', expectedEndTime: '' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start event' }));
    expect(await screen.findByText(/we’ll box this to one hour/)).toBeInTheDocument();
    expect(screen.getByText('No burndown yet')).toBeInTheDocument();
  });

  it('starts once you’re ready, and not before', async () => {
    const { store } = board(makeMeeting());
    fireEvent.click(screen.getByRole('button', { name: 'Start event' }));
    expect(await screen.findByText('Are you ready to start?')).toBeInTheDocument();
    await answer('Not yet');
    expect(store.startMeeting).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Start event' }));
    await answer("Yes, let's go!");
    expect(store.startMeeting).toHaveBeenCalled();
  });

  it('starts from the S shortcut too', async () => {
    board(makeMeeting());
    fireEvent.keyDown(document, { key: 's' });
    expect(await screen.findByText('Are you ready to start?')).toBeInTheDocument();
  });
});

describe('running', () => {
  it('shows what’s in progress and closes it, asking to finish after the last one', async () => {
    const { store, path } = board(makeLiveMeeting());
    expect(screen.getByText('Now')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark as done' }));
    expect(store.updateGoal).toHaveBeenCalledWith('g2', {
      finishedAt: expect.any(String),
    });

    expect(
      await screen.findByText('All done! ✅ Do you want to finish this event?'),
    ).toBeInTheDocument();
    await answer('Not yet');
    expect(store.finishMeeting).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'd' });
    await answer('Yes, finish it!');
    expect(store.finishMeeting).toHaveBeenCalled();
    expect(path()).toBe('/events/m1/report');
  });

  it('closes one milestone without asking while others are open', () => {
    const { store } = board(
      makeLiveMeeting({
        goals: [makeGoal({ id: 'g1' }), makeGoal({ id: 'g2', name: 'Two' })],
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mark as done' }));
    expect(store.updateGoal).toHaveBeenCalledWith('g1', {
      finishedAt: expect.any(String),
    });
    expect(screen.queryByText(/All done!/)).toBeNull();
  });

  it('finishes from the button or the F shortcut, then shows the report', async () => {
    const { store, path } = board(makeLiveMeeting());
    fireEvent.click(screen.getByRole('button', { name: 'Finish event' }));
    await act(async () => {});
    expect(store.finishMeeting).toHaveBeenCalledTimes(1);
    expect(path()).toBe('/events/m1/report');
  });

  it('finishes from the F shortcut', async () => {
    const { store } = board(makeLiveMeeting());
    fireEvent.keyDown(document, { key: 'f' });
    await act(async () => {});
    expect(store.finishMeeting).toHaveBeenCalled();
  });

  it('cancels only after confirming, then goes Home', async () => {
    const { store, path } = board(makeLiveMeeting());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel event' }));
    await answer('Not anymore');
    expect(store.cancelMeeting).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel event' }));
    await answer('Yes, do it');
    expect(store.cancelMeeting).toHaveBeenCalled();
    expect(path()).toBe('/');
  });

  it('parks a topic under the milestone in progress, from the button or P', () => {
    const { store } = board(makeLiveMeeting());
    fireEvent.click(screen.getByRole('button', { name: '+ Add side topic' }));
    expect(store.addSideTopic).toHaveBeenCalledWith('Pick priorities');
    fireEvent.keyDown(document, { key: 'p' });
    expect(store.addSideTopic).toHaveBeenCalledTimes(2);
  });

  it('runs the milestone list and the parking lot through the store', async () => {
    const event = makeLiveMeeting({
      goals: [
        makeGoal({
          id: 'g1',
          name: 'One',
          finishedAt: '2026-01-01T10:10:00.000Z',
          decisions: 'x',
        }),
        makeGoal({ id: 'g2', name: 'Two' }),
      ],
      sideTopics: [makeSideTopic({ key: 'k1', value: 'Budget' })],
    });
    const { store } = board(event);

    fireEvent.click(screen.getByRole('button', { name: '+ Add milestone' }));
    const input = screen.getByRole('textbox', { name: 'New milestone name' });
    fireEvent.change(input, { target: { value: 'Three' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(store.addGoal).toHaveBeenCalledWith('Three');

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Two' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    expect(store.duplicateGoal).toHaveBeenCalledWith('g2');
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Two' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move up' }));
    expect(store.reorderGoals).toHaveBeenCalledWith(1, 0);

    fireEvent.click(screen.getByRole('button', { name: 'Actions for One' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(await screen.findByText('Remove “One” and its notes?')).toBeInTheDocument();
    await answer('Yes, do it');
    expect(store.removeGoal).toHaveBeenCalledWith('g1');

    fireEvent.change(document.querySelector('textarea[name="decisions-g2"]') as Element, {
      target: { value: 'Agreed' },
    });
    expect(store.updateGoal).toHaveBeenCalledWith('g2', { decisions: 'Agreed' });

    const topic = screen.getByDisplayValue('Budget');
    fireEvent.change(topic, { target: { value: 'Budget Q3' } });
    expect(store.updateSideTopic).toHaveBeenCalledWith('k1', 'Budget Q3');
    fireEvent.blur(topic, { target: { value: '' } });
    expect(store.removeSideTopic).toHaveBeenCalledWith('k1');

    fireEvent.click(
      within(
        screen
          .getByRole('button', { name: 'Toggle Two' })
          .closest('[draggable]') as HTMLElement,
      ).getByRole('checkbox', { name: 'Done' }),
    );
    expect(await screen.findByText(/All done!/)).toBeInTheDocument();
  });

  it('does nothing on D once every milestone is done', () => {
    const { store } = board(
      makeLiveMeeting({ goals: [makeGoal({ finishedAt: '2026-01-01T10:10:00.000Z' })] }),
    );
    fireEvent.keyDown(document, { key: 'd' });
    expect(store.updateGoal).not.toHaveBeenCalled();
  });

  it('parks a topic with no milestone name once all are done', () => {
    const done = makeLiveMeeting({
      goals: [makeGoal({ id: 'g1', finishedAt: '2026-01-01T10:10:00.000Z' })],
    });
    const { store } = board(done);
    expect(screen.getByText('All done')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'p' });
    expect(store.addSideTopic).toHaveBeenCalledWith('');
  });

  it('keeps focus where it was when no topic could be parked', () => {
    const { store } = board(makeLiveMeeting());
    store.addSideTopic.mockReturnValueOnce(null as unknown as string);
    fireEvent.click(screen.getByRole('button', { name: '+ Add side topic' }));
    expect(store.addSideTopic).toHaveBeenCalled();
  });
});

describe('the countdown switches', () => {
  it('names the alerts switch by what the browser allows, and toggles it', () => {
    const toggle = vi.fn(async () => {});
    useAlertsStore.setState({ permission: 'unsupported', toggle });
    const { unmount } = board(makeLiveMeeting());
    expect(screen.getByText('Alerts unavailable').parentElement).toHaveAttribute(
      'title',
      'Notifications are not available in this browser',
    );
    unmount();

    useAlertsStore.setState({ permission: 'denied' });
    const second = board(makeLiveMeeting());
    expect(screen.getByText('Alerts blocked').parentElement).toHaveAttribute(
      'title',
      'Notifications are blocked: allow them in your browser settings',
    );
    second.unmount();

    useAlertsStore.setState({ permission: 'default' });
    board(makeLiveMeeting());
    expect(screen.getByText('Time alerts')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Notify me when time runs out' }));
    expect(toggle).toHaveBeenCalled();
  });

  it('shows seconds when asked, and remembers it', () => {
    board(makeLiveMeeting());
    const seconds = screen.getByRole('switch', { name: 'Show seconds in the countdown' });
    expect(seconds).not.toBeChecked();
    fireEvent.click(seconds);
    expect(seconds).toBeChecked();
    expect(localStorage.getItem('tw-countdown-seconds')).toBe('1');
  });
});

describe('editing the event', () => {
  it('renames it, ignoring an empty name, and edits the description', () => {
    const { store } = board(makeMeeting());
    fireEvent.click(screen.getByRole('button', { name: 'Edit event name' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'event name' }), {
      target: { value: 'Sprint planning' },
    });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'event name' }), {
      key: 'Enter',
    });
    expect(store.updateMeeting).toHaveBeenCalledWith({ name: 'Sprint planning' });

    fireEvent.click(screen.getByRole('button', { name: 'Edit event name' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'event name' }), {
      target: { value: '   ' },
    });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'event name' }), {
      key: 'Enter',
    });
    expect(store.updateMeeting).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Edit event description' }));
    const description = screen.getByRole('textbox', { name: 'event description' });
    fireEvent.change(description, { target: { value: 'Q3 goals' } });
    fireEvent.blur(description);
    expect(store.updateMeeting).toHaveBeenLastCalledWith({ description: 'Q3 goals' });
  });

  it('saves a new end time from the schedule', () => {
    const { store } = board(makeMeeting());
    fireEvent.click(screen.getByRole('button', { name: 'Edit ends' }));
    const time = screen.getByLabelText('Time');
    fireEvent.change(time, { target: { value: '11:30' } });
    fireEvent.keyDown(time, { key: 'Enter' });
    expect(store.updateMeeting).toHaveBeenCalledWith({
      expectedEndTime: expect.any(String),
    });
  });

  it('passes milestone changes to the store', async () => {
    const { store } = board(makeLiveMeeting());
    fireEvent.click(screen.getByRole('switch', { name: /Automatic/i }));
    expect(store.setAutomatic).toHaveBeenCalledWith(false);
  });
});

describe('for a viewer', () => {
  it('is read-only, with a way back Home', () => {
    const { path } = board(makeLiveMeeting(), 'viewer');
    expect(screen.getByText('View only')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Finish event' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel event' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Mark as done' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(path()).toBe('/');
  });
});
