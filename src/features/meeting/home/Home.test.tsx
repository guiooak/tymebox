import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeAuthUser,
  makeFinishedMeeting,
  makeLiveMeeting,
  makeMeeting,
  makeSharedSummary,
} from '../../../test/fixtures';
import { renderWithApp, type RenderOptions } from '../../../test/render';
import type { Meeting } from '../domain/types';
import { Home } from './Home';

/*
 * Home, from a first visit to a busy account. Today is 15 January 2026, 09:00
 * local time; events are relative to that.
 */

const NOW = new Date(2026, 0, 15, 9, 0);
const iso = (days: number, hours = 10, minutes = 0) =>
  new Date(2026, 0, 15 + days, hours, minutes).toISOString();

/** Finished `days` ago, `minutes` long against a 60-minute plan. */
const finished = (
  id: string,
  days: number,
  minutes: number,
  over: Partial<Meeting> = {},
) =>
  makeFinishedMeeting({
    id,
    name: `Event ${id}`,
    expectedStartTime: iso(-days),
    expectedEndTime: iso(-days, 11),
    realStartTime: iso(-days),
    realEndTime: iso(-days, 10, minutes),
    ...over,
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function home(store: RenderOptions['store'] = {}, user = makeAuthUser()) {
  const actions = {
    reopen: vi.fn(async () => {}),
    clone: vi.fn(async () => 'cloned'),
    createFromTemplate: vi.fn(async () => 'templated'),
    deleteEvent: vi.fn(async () => {}),
  };
  const view = renderWithApp(<Home />, {
    auth: { status: 'authenticated', user },
    store: {
      ...actions,
      loading: false,
      meetings: [],
      sharedLoading: false,
      sharedEvents: [],
      requestCounts: {},
      ...store,
    },
  });
  return { ...view, ...actions };
}

describe('Home', () => {
  it('waits for your events', () => {
    home({ loading: true });
    expect(screen.getByText('Loading your events…')).toBeInTheDocument();
  });

  it('greets you by first name and time of day', () => {
    const { unmount } = home({}, makeAuthUser({ displayName: 'Ana Souza' }));
    expect(
      screen.getByRole('heading', { name: 'Good morning, Ana' }),
    ).toBeInTheDocument();
    unmount();

    vi.setSystemTime(new Date(2026, 0, 15, 14));
    const afternoon = home({}, makeAuthUser({ displayName: null }));
    expect(screen.getByRole('heading', { name: 'Good afternoon' })).toBeInTheDocument();
    afternoon.unmount();

    vi.setSystemTime(new Date(2026, 0, 15, 20));
    home({}, null as never);
    expect(screen.getByRole('heading', { name: 'Good evening' })).toBeInTheDocument();
  });

  it('welcomes a new account with the walkthrough and a sample event', async () => {
    const { createFromTemplate, path } = home();
    expect(
      screen.getByRole('heading', { name: 'How Tymebox works' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No events yet')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Try a sample event' }));
    });
    expect(createFromTemplate).toHaveBeenCalledWith('Sample event', [
      'Look around the board',
      'Add a milestone of your own',
      'Finish and read the report',
    ]);
    expect(path()).toBe('/events/templated');
    expect(localStorage.getItem('tw-onboarding-dismissed')).toBe('1');
  });

  it('plans a new event from the header or the empty state', () => {
    const { path } = home();
    fireEvent.click(screen.getByRole('button', { name: 'Plan an event' }));
    expect(path()).toBe('/events/new');
    fireEvent.click(screen.getByRole('button', { name: '+ New event' }));
    expect(path()).toBe('/events/new');
  });

  it('starts from a template', async () => {
    const { createFromTemplate, path } = home();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Retro/ }));
    });
    expect(createFromTemplate).toHaveBeenCalledWith('Retro', [
      'What went well',
      'What didn’t',
      'What we’ll change',
      'Action items',
    ]);
    expect(path()).toBe('/events/templated');
  });

  it('stays put when a template couldn’t be created', async () => {
    const { createFromTemplate, path } = home();
    createFromTemplate.mockResolvedValueOnce(null as unknown as string);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^1:1/ }));
    });
    expect(path()).toBe('/');
  });

  it.each([
    [
      'a draft',
      makeMeeting({ name: '' }),
      'Continue planning',
      'You have a draft in the works.',
      '/events/m1',
    ],
    [
      'a live event',
      makeLiveMeeting(),
      'Resume live event',
      'You have an event in progress.',
      '/events/m1',
    ],
    [
      'a finished event',
      makeFinishedMeeting(),
      'View last report',
      'Your most recent event is wrapped up.',
      '/events/m1/report',
    ],
  ])('picks up %s where you left it', (_case, current, label, hint, target) => {
    const { path } = home({ currentMeeting: current, meetings: [current] });
    expect(screen.getByText(hint)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(path()).toBe(target);
  });

  it('names an untitled current event as such', () => {
    home({
      currentMeeting: makeMeeting({ name: '' }),
      meetings: [makeMeeting({ name: '' })],
    });
    expect(screen.getByText('Untitled event')).toBeInTheDocument();
  });

  it('lists what starts soon, to open or delete', async () => {
    const soon = makeMeeting({
      id: 's',
      name: 'Kick-off',
      expectedStartTime: iso(1),
      expectedEndTime: iso(1, 11),
    });
    const { reopen, path } = home({ meetings: [soon] });
    expect(screen.getByRole('heading', { name: 'Starting soon' })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Kick-off' }));
    });
    expect(reopen).toHaveBeenCalledWith('s');
    expect(path()).toBe('/events/s');

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Kick-off' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Open board' }));
    });
    expect(reopen).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Kick-off' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete event' }));
    expect(
      await screen.findByRole('dialog', { name: 'Delete this event?' }),
    ).toBeInTheDocument();
  });

  it('shows recent events, to read, clone or delete, and repeats the last one', async () => {
    const events = [finished('a', 1, 50), finished('b', 2, 70, { goals: [] })];
    const { reopen, clone, path } = home({ meetings: events });
    const recent = screen
      .getByRole('heading', { name: 'Recent events' })
      .closest('section') as HTMLElement;
    expect(within(recent).getAllByRole('button', { name: /^Event / })).toHaveLength(2);
    expect(within(recent).getByText(/· 0 goals$/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(within(recent).getByRole('button', { name: 'Event a' }));
    });
    expect(reopen).toHaveBeenCalledWith('a');
    expect(path()).toBe('/events/a/report');

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Event b' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'View report' }));
    });
    expect(path()).toBe('/events/b/report');

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Event b' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Clone' }));
    });
    expect(clone).toHaveBeenCalledWith('b');
    expect(path()).toBe('/events/cloned');

    const repeat = screen.getByRole('button', { name: /Repeat “Event a”/ });
    expect(repeat).toHaveAttribute('title', '2 milestones · your last event');
    await act(async () => {
      fireEvent.click(repeat);
    });
    expect(clone).toHaveBeenLastCalledWith('a');

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Event a' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete event' }));
    expect(
      await screen.findByRole('dialog', { name: 'Delete this event?' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View all' }));
    expect(path()).toBe('/events');
  });

  it('stays put when a clone couldn’t be made', async () => {
    const { clone, path } = home({ meetings: [finished('a', 1, 50)] });
    clone.mockResolvedValueOnce(null as unknown as string);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Repeat/ }));
    });
    expect(path()).toBe('/');
  });

  it('asks you to finish an event when none is finished yet', () => {
    home({ meetings: [makeMeeting()] });
    expect(screen.getByText('Finish an event to see it here.')).toBeInTheDocument();
    const metric = screen.getByText('Time vs budget').closest('div') as HTMLElement;
    expect(metric).toHaveTextContent('—Time vs budgetNo finished events yet');
    expect(metric.className).not.toMatch(/toned/);
    expect(screen.getByText('Finish an event on time to start one')).toBeInTheDocument();
  });

  const metric = (label: string) => screen.getByText(label).closest('div') as HTMLElement;

  it('colours each metric by what it says', () => {
    // Two events under budget (50 of 60 minutes), every goal done, this month.
    home({ meetings: [finished('a', 1, 50), finished('b', 2, 50)] });
    expect(metric('Time vs budget')).toHaveTextContent('17% under');
    expect(metric('Time vs budget').className).toMatch(/tone-good/);
    expect(metric('Goals completed')).toHaveTextContent('100%');
    expect(metric('Goals completed').className).toMatch(/tone-good/);
    expect(metric('This month').className).toMatch(/tone-info/);
    expect(metric('On-budget streak')).toHaveTextContent('2 🔥');
    expect(metric('On-budget streak').className).toMatch(/tone-streak/);
    expect(screen.getByText('1h 40m spent in total')).toBeInTheDocument();
  });

  it('warns for a small overrun and half the goals done', () => {
    const goals = [
      { id: 'g1', name: 'A', weight: 1, finishedAt: iso(-1, 10, 10), decisions: '' },
      { id: 'g2', name: 'B', weight: 1, finishedAt: '', decisions: '' },
    ];
    home({ meetings: [finished('a', 1, 66, { goals })] });
    expect(metric('Time vs budget')).toHaveTextContent('10% over');
    expect(metric('Time vs budget').className).toMatch(/tone-warn/);
    expect(metric('Goals completed')).toHaveTextContent('50%');
    expect(metric('Goals completed').className).toMatch(/tone-warn/);
    expect(metric('On-budget streak')).toHaveTextContent('—');
  });

  it('flags a big overrun and few goals done, and an exact hit', () => {
    const goals = [
      { id: 'g1', name: 'A', weight: 1, finishedAt: '', decisions: '' },
      { id: 'g2', name: 'B', weight: 1, finishedAt: '', decisions: '' },
    ];
    const { unmount } = home({ meetings: [finished('a', 1, 90, { goals })] });
    expect(metric('Time vs budget').className).toMatch(/tone-bad/);
    expect(metric('Goals completed').className).toMatch(/tone-bad/);
    unmount();

    home({ meetings: [finished('a', 1, 60, { goals: [] })] });
    expect(metric('Time vs budget')).toHaveTextContent('On budget');
    expect(metric('Goals completed')).toHaveTextContent('—');
  });

  it('leaves this month neutral when nothing finished this month', () => {
    home({ meetings: [finished('old', 40, 50)] });
    expect(metric('This month')).toHaveTextContent('0');
    expect(metric('This month').className).not.toMatch(/toned/);
  });
});

describe('OnboardingCard', () => {
  it('goes away once dismissed, and stays away', () => {
    const { unmount } = home();
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('heading', { name: 'How Tymebox works' })).toBeNull();
    unmount();
    home();
    expect(screen.queryByRole('heading', { name: 'How Tymebox works' })).toBeNull();
  });
});

describe('AccessRequestsNotice', () => {
  it('counts requests on your events and opens each one where it lives', () => {
    const live = makeLiveMeeting({ id: 'live', name: '' });
    const done = makeFinishedMeeting({ id: 'done', name: 'Retro' });
    const { path } = home({
      meetings: [live, done],
      requestCounts: { live: 2, done: 1, gone: 3, quiet: 0 },
    });
    expect(screen.getByText('3 people are asking for access')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Untitled event (2)' }));
    expect(path()).toBe('/events/live');
    fireEvent.click(screen.getByRole('button', { name: 'Retro (1)' }));
    expect(path()).toBe('/events/done/report');
  });

  it('speaks of one person in the singular, and hides with none', () => {
    const event = makeMeeting();
    const { unmount } = home({ meetings: [event], requestCounts: { m1: 1 } });
    expect(screen.getByText('1 person is asking for access')).toBeInTheDocument();
    unmount();
    home({ meetings: [event], requestCounts: { m1: 0 } });
    expect(screen.queryByText(/asking for access/)).toBeNull();
  });
});

describe('SharedWithMe', () => {
  it('waits for the list, then says when nothing is shared', () => {
    const { unmount } = home({ sharedLoading: true });
    expect(screen.queryByRole('region', { name: 'Shared with me' })).toBeNull();
    unmount();
    home();
    expect(screen.getByText('Nothing shared with you yet')).toBeInTheDocument();
  });

  it('lists events shared with you, opening each on its board or report', () => {
    const { path } = home({
      sharedEvents: [
        makeSharedSummary({
          id: 'live',
          name: 'Planning',
          status: 'active',
          via: 'contributor',
        }),
        makeSharedSummary({
          id: 'done',
          name: '',
          ownerName: '',
          status: 'finished',
          via: 'public',
          realEndTime: iso(-1),
        }),
        makeSharedSummary({
          id: 'odd',
          name: 'Odd',
          status: 'finished',
          realEndTime: '',
        }),
      ],
    });
    const region = screen.getByRole('region', { name: 'Shared with me' });
    expect(within(region).getByText('Contributor')).toBeInTheDocument();
    expect(within(region).getByText('Public link')).toBeInTheDocument();
    expect(within(region).getByText(/^by someone · /)).toBeInTheDocument();
    // A finished event with no end date shows no date.
    expect(within(region).getAllByText('by Bruno', { exact: true })).toHaveLength(2);

    fireEvent.click(within(region).getByRole('button', { name: 'Planning' }));
    expect(path()).toBe('/events/live');
    fireEvent.click(
      within(region).getByRole('button', { name: 'Actions for this event' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'View report' }));
    expect(path()).toBe('/events/done/report');
  });
});
