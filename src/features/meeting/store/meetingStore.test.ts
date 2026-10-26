import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addHours, toISO } from '../../../common/services/datetime';
import {
  T0,
  makeAccess,
  makeFinishedMeeting,
  makeGoal,
  makeLiveMeeting,
  makeMeeting,
  makeMember,
  makeRequest,
  makeViewer,
} from '../../../test/fixtures';
import type { Meeting } from '../domain/types';

/*
 * The store with its logic real and the repository replaced. Subscriptions are
 * captured so a test can play the database: `emit('subscribeMeeting', 'm1', x)`
 * calls the callback the store registered for event m1.
 */

type Sub = {
  args: unknown[];
  callback: (value: unknown) => void;
  denied?: (error: Error) => void;
  off: ReturnType<typeof vi.fn>;
};
const subs: Record<string, Sub[]> = {};

function subscription(name: string) {
  return vi.fn((...args: unknown[]) => {
    const functions = args.filter((arg) => typeof arg === 'function') as Array<
      (value: unknown) => void
    >;
    const sub: Sub = {
      args,
      callback: functions[0],
      denied: functions[1] as Sub['denied'],
      off: vi.fn(),
    };
    (subs[name] ??= []).push(sub);
    return sub.off;
  });
}

/** The latest subscription of a kind, optionally for one key (its first argument). */
function lastSub(name: string, key?: string): Sub {
  const list = (subs[name] ?? []).filter(
    (sub) => key === undefined || sub.args[0] === key,
  );
  const sub = list.at(-1);
  if (!sub) {
    throw new Error(`No ${name} subscription${key ? ` for ${key}` : ''}`);
  }
  return sub;
}

const emit = (name: string, key: string | undefined, value: unknown) =>
  lastSub(name, key).callback(value);

vi.mock('../domain/meetingRepository', () => ({
  subscribeOwnMeetings: subscription('subscribeOwnMeetings'),
  subscribeUserData: subscription('subscribeUserData'),
  subscribeSharedWith: subscription('subscribeSharedWith'),
  subscribeRequestsByOwner: subscription('subscribeRequestsByOwner'),
  subscribeMeeting: subscription('subscribeMeeting'),
  subscribeAccessSettings: subscription('subscribeAccessSettings'),
  subscribeMyMembership: subscription('subscribeMyMembership'),
  subscribeMyRequest: subscription('subscribeMyRequest'),
  subscribeMembers: subscription('subscribeMembers'),
  subscribeRequests: subscription('subscribeRequests'),
  forgetVisit: vi.fn(async () => {}),
  recordVisit: vi.fn(async () => {}),
  migrateLegacyMeetings: vi.fn(async () => {}),
  expireRequests: vi.fn(async () => 0),
  setUserLocale: vi.fn(async () => {}),
  setAutomaticBehavior: vi.fn(async () => {}),
  newMeetingId: vi.fn(() => 'new-id'),
  createMeeting: vi.fn(async () => {}),
  patchMeeting: vi.fn(async () => {}),
  setCurrentMeetingId: vi.fn(async () => {}),
  deleteMeetingEverywhere: vi.fn(async () => {}),
  deleteMeeting: vi.fn(async () => {}),
  resetProgress: vi.fn(async () => {}),
  patchGoal: vi.fn(async () => {}),
  putGoal: vi.fn(async () => {}),
  deleteGoal: vi.fn(async () => {}),
  setGoalOrder: vi.fn(async () => {}),
  newSideTopicKey: vi.fn(() => 'topic-key'),
  putSideTopic: vi.fn(async () => {}),
  setSideTopicValue: vi.fn(async () => {}),
  deleteSideTopic: vi.fn(async () => {}),
  setVisibility: vi.fn(async () => {}),
  shareWith: vi.fn(async () => {}),
  setMemberRole: vi.fn(async () => {}),
  unshare: vi.fn(async () => {}),
  approveRequest: vi.fn(async () => {}),
  denyRequest: vi.fn(async () => {}),
  requestAccess: vi.fn(async () => {}),
  cancelAccessRequest: vi.fn(async () => {}),
}));

const repo = await import('../domain/meetingRepository');
const { useMeetingStore } = await import('./meetingStore');
const { useI18nStore } = await import('../../../common/services/i18n');

const store = () => useMeetingStore.getState();
const user = makeViewer();
const meeting = makeLiveMeeting();

/** The profile, as subscribeUserData hands it over. */
const userData = (over: Record<string, unknown> = {}) => ({
  currentMeetingId: null,
  decisionsAutomaticBehavior: true,
  locale: 'en-US',
  visitedIds: [],
  legacy: {},
  ...over,
});

/** An event open on the board, as the owner. */
function openAsOwner(event: Meeting = meeting) {
  useMeetingStore.setState({
    user,
    meetings: [event],
    currentMeetingId: event.id,
    currentMeeting: event,
    openId: event.id,
    event,
    role: 'owner',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const name of Object.keys(subs)) {
    delete subs[name];
  }
  useMeetingStore.setState(useMeetingStore.getInitialState(), true);
  useI18nStore.getState().setLocale('en-US');
});

afterEach(() => {
  store().release();
  vi.useRealTimers();
});

describe('bind: the signed-in session', () => {
  it('stays loading until both your events and your profile have arrived', () => {
    store().bind(user);
    expect(store()).toMatchObject({ user, loading: true });

    emit('subscribeOwnMeetings', 'u1', [meeting]);
    expect(store().loading).toBe(true);
    emit('subscribeUserData', 'u1', userData());
    expect(store()).toMatchObject({ loading: false, meetings: [meeting] });
  });

  it('is ready in either order', () => {
    store().bind(user);
    emit('subscribeUserData', 'u1', userData());
    expect(store().loading).toBe(true);
    emit('subscribeOwnMeetings', 'u1', []);
    expect(store().loading).toBe(false);
  });

  it('points "current" at the event named in the profile, if it is still yours', () => {
    store().bind(user);
    emit('subscribeOwnMeetings', 'u1', [meeting]);
    emit('subscribeUserData', 'u1', userData({ currentMeetingId: 'm1' }));
    expect(store().currentMeeting).toEqual(meeting);

    emit('subscribeOwnMeetings', 'u1', []);
    expect(store().currentMeeting).toBeNull();
  });

  it('takes the language from the profile', () => {
    store().bind(user);
    emit('subscribeUserData', 'u1', userData({ locale: 'pt-BR' }));
    expect(useI18nStore.getState().locale).toBe('pt-BR');
    expect(repo.setUserLocale).not.toHaveBeenCalled();

    // Same language again: nothing to change.
    emit('subscribeUserData', 'u1', userData({ locale: 'pt-BR' }));
    expect(useI18nStore.getState().locale).toBe('pt-BR');
  });

  it('saves the language picked on this device when the profile has none', () => {
    store().bind(user);
    emit('subscribeUserData', 'u1', userData({ locale: null }));
    expect(repo.setUserLocale).toHaveBeenCalledWith('u1', 'en-US');
  });

  it('keeps the automatic-mode setting and visits from the profile', () => {
    store().bind(user);
    emit(
      'subscribeUserData',
      'u1',
      userData({ decisionsAutomaticBehavior: false, visitedIds: [] }),
    );
    expect(store().decisionsAutomaticBehavior).toBe(false);
  });

  it('moves old per-user events once, and again only after that finished', async () => {
    let finish!: () => void;
    vi.mocked(repo.migrateLegacyMeetings).mockImplementationOnce(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    store().bind(user);
    const legacy = { old1: { name: 'Old' } };
    emit('subscribeUserData', 'u1', userData({ legacy }));
    emit('subscribeUserData', 'u1', userData({ legacy }));
    expect(repo.migrateLegacyMeetings).toHaveBeenCalledTimes(1);
    expect(repo.migrateLegacyMeetings).toHaveBeenCalledWith('u1', 'Ana', legacy);

    finish();
    await Promise.resolve();
    await Promise.resolve();
    emit('subscribeUserData', 'u1', userData({ legacy }));
    expect(repo.migrateLegacyMeetings).toHaveBeenCalledTimes(2);
  });

  it('counts pending requests and sweeps expired ones once per session', async () => {
    vi.mocked(repo.expireRequests).mockRejectedValueOnce(new Error('offline'));
    store().bind(user);
    emit('subscribeRequestsByOwner', 'u1', { m1: 2 });
    emit('subscribeRequestsByOwner', 'u1', { m1: 1 });
    expect(store().requestCounts).toEqual({ m1: 1 });
    expect(repo.expireRequests).toHaveBeenCalledTimes(1);
    expect(repo.expireRequests).toHaveBeenCalledWith('u1', ['m1']);
    await Promise.resolve(); // the rejected sweep is swallowed
  });

  it('skips the shared-with-me index for an account without an email', () => {
    store().bind(makeViewer({ email: '' }));
    expect(repo.subscribeSharedWith).not.toHaveBeenCalled();
    expect(store().sharedLoading).toBe(false);
  });

  it('ends every subscription once, on cleanup or release', () => {
    const cleanup = store().bind(user);
    emit('subscribeSharedWith', 'ana@example.com', [
      { id: 's1', role: 'viewer', addedAt: 1 },
    ]);
    cleanup();
    for (const name of [
      'subscribeOwnMeetings',
      'subscribeUserData',
      'subscribeSharedWith',
      'subscribeRequestsByOwner',
    ]) {
      expect(lastSub(name).off).toHaveBeenCalledTimes(1);
    }
    expect(lastSub('subscribeMeeting', 's1').off).toHaveBeenCalledTimes(1);
    expect(store()).toMatchObject({ user: null, meetings: [], openId: null });

    cleanup();
    store().release();
    expect(lastSub('subscribeOwnMeetings').off).toHaveBeenCalledTimes(1);
  });

  it('release() ends the running session', () => {
    store().bind(user);
    store().release();
    expect(lastSub('subscribeUserData').off).toHaveBeenCalledTimes(1);
    expect(store().user).toBeNull();
  });
});

describe('bind: "Shared with me"', () => {
  const theirs = (over: Partial<Meeting> = {}) =>
    makeMeeting({
      id: 's1',
      owner: 'u2',
      ownerName: 'Bruno',
      name: 'Their retro',
      ...over,
    });

  function bindWithShares() {
    store().bind(user);
    emit('subscribeOwnMeetings', 'u1', [meeting]);
  }

  it('follows each shared event and lists it with how you reach it', () => {
    bindWithShares();
    emit('subscribeSharedWith', 'ana@example.com', [
      { id: 's1', role: 'contributor', addedAt: 1 },
    ]);
    expect(store().sharedLoading).toBe(false);
    emit('subscribeMeeting', 's1', theirs());
    expect(store().sharedEvents).toEqual([
      expect.objectContaining({ id: 's1', name: 'Their retro', via: 'contributor' }),
    ]);
  });

  it('lists public events you opened, an invite winning over the visit', () => {
    bindWithShares();
    emit('subscribeUserData', 'u1', userData({ visitedIds: ['s1'] }));
    emit('subscribeMeeting', 's1', theirs());
    expect(store().sharedEvents[0].via).toBe('public');

    emit('subscribeSharedWith', 'ana@example.com', [
      { id: 's1', role: 'viewer', addedAt: 1 },
    ]);
    expect(store().sharedEvents[0].via).toBe('viewer');
    expect(repo.subscribeMeeting).toHaveBeenCalledTimes(1);
  });

  it('never lists your own events', () => {
    bindWithShares();
    emit('subscribeSharedWith', 'ana@example.com', [
      { id: 'm1', role: 'viewer', addedAt: 1 },
    ]);
    expect(repo.subscribeMeeting).not.toHaveBeenCalled();
  });

  it('puts live events first, then the most recently changed', () => {
    bindWithShares();
    emit('subscribeSharedWith', 'ana@example.com', [
      { id: 'a', role: 'viewer', addedAt: 1 },
      { id: 'b', role: 'viewer', addedAt: 1 },
      { id: 'c', role: 'viewer', addedAt: 1 },
    ]);
    emit('subscribeMeeting', 'a', theirs({ id: 'a', updatedAt: '2026-01-02' }));
    emit('subscribeMeeting', 'b', theirs({ id: 'b', updatedAt: '2026-01-03' }));
    emit(
      'subscribeMeeting',
      'c',
      theirs({ id: 'c', status: 'active', updatedAt: '2026-01-01' }),
    );
    expect(store().sharedEvents.map((event) => event.id)).toEqual(['c', 'b', 'a']);
  });

  it('orders the same way whichever arrives first', () => {
    bindWithShares();
    emit('subscribeSharedWith', 'ana@example.com', [
      { id: 'new', role: 'viewer', addedAt: 1 },
      { id: 'old', role: 'viewer', addedAt: 1 },
    ]);
    emit('subscribeMeeting', 'new', theirs({ id: 'new', updatedAt: '2026-01-03' }));
    emit('subscribeMeeting', 'old', theirs({ id: 'old', updatedAt: '2026-01-01' }));
    expect(store().sharedEvents.map((event) => event.id)).toEqual(['new', 'old']);
  });

  it('drops an event that disappears or stops being shared', () => {
    bindWithShares();
    emit('subscribeSharedWith', 'ana@example.com', [
      { id: 's1', role: 'viewer', addedAt: 1 },
    ]);
    emit('subscribeMeeting', 's1', theirs());
    emit('subscribeMeeting', 's1', null);
    expect(store().sharedEvents).toEqual([]);

    emit('subscribeMeeting', 's1', theirs());
    emit('subscribeSharedWith', 'ana@example.com', []);
    expect(lastSub('subscribeMeeting', 's1').off).toHaveBeenCalled();
    expect(store().sharedEvents).toEqual([]);
  });

  it('forgets a visited public event once access is refused', () => {
    bindWithShares();
    emit('subscribeUserData', 'u1', userData({ visitedIds: ['s1'] }));
    emit('subscribeMeeting', 's1', theirs());
    lastSub('subscribeMeeting', 's1').denied?.(new Error('permission_denied'));
    expect(store().sharedEvents).toEqual([]);
    expect(repo.forgetVisit).toHaveBeenCalledWith('u1', 's1');
  });

  it('drops an invite that is refused without touching visits', () => {
    bindWithShares();
    emit('subscribeSharedWith', 'ana@example.com', [
      { id: 's1', role: 'viewer', addedAt: 1 },
    ]);
    lastSub('subscribeMeeting', 's1').denied?.(new Error('permission_denied'));
    expect(repo.forgetVisit).not.toHaveBeenCalled();
  });
});

describe('openEvent', () => {
  beforeEach(() => {
    useMeetingStore.setState({ user });
  });

  it('does nothing signed out', () => {
    useMeetingStore.setState({ user: null });
    const close = store().openEvent('m1');
    expect(repo.subscribeMeeting).not.toHaveBeenCalled();
    close();
  });

  it('loads your own event as its owner, with members and requests', () => {
    store().openEvent('m1');
    expect(store()).toMatchObject({ openId: 'm1', eventView: 'loading' });

    emit('subscribeMeeting', 'm1', meeting);
    emit('subscribeAccessSettings', 'm1', makeAccess());
    expect(store()).toMatchObject({ event: meeting, eventView: 'ready', role: 'owner' });

    emit('subscribeMembers', 'm1', [makeMember()]);
    emit('subscribeRequests', 'm1', [makeRequest()]);
    expect(store().members).toEqual([makeMember()]);
    expect(store().requests).toEqual([makeRequest()]);

    // More access updates don't subscribe twice.
    emit('subscribeAccessSettings', 'm1', makeAccess());
    expect(repo.subscribeMembers).toHaveBeenCalledTimes(1);
  });

  it('gives a member their role, and drops owner data when ownership is not yours', () => {
    store().openEvent('m1');
    emit('subscribeAccessSettings', 'm1', makeAccess());
    expect(store().role).toBe('owner');

    emit('subscribeAccessSettings', 'm1', makeAccess({ owner: 'u2' }));
    emit('subscribeMyMembership', 'm1', makeMember({ role: 'contributor' }));
    expect(store().role).toBe('contributor');
    expect(lastSub('subscribeMembers').off).toHaveBeenCalled();
    expect(store()).toMatchObject({ members: [], requests: [] });
  });

  it('shows "denied" when the event is refused or missing, and loads it once access arrives', () => {
    store().openEvent('m1');
    lastSub('subscribeMeeting', 'm1').denied?.(new Error('permission_denied'));
    expect(store()).toMatchObject({ event: null, eventView: 'denied' });

    emit('subscribeAccessSettings', 'm1', makeAccess({ owner: 'u2' }));
    expect(store().role).toBeNull();
    expect(repo.subscribeMeeting).toHaveBeenCalledTimes(1);

    emit('subscribeMyMembership', 'm1', makeMember());
    expect(repo.subscribeMeeting).toHaveBeenCalledTimes(2);
    emit('subscribeMeeting', 'm1', null);
    expect(store().eventView).toBe('denied');
  });

  it('records one visit to a public event you were not invited to', () => {
    store().openEvent('m1');
    emit(
      'subscribeAccessSettings',
      'm1',
      makeAccess({ owner: 'u2', visibility: 'public', publicRole: 'viewer' }),
    );
    emit('subscribeMyMembership', 'm1', null);
    expect(repo.recordVisit).toHaveBeenCalledTimes(1);
    expect(repo.recordVisit).toHaveBeenCalledWith('u1', 'm1');
    expect(store().role).toBe('viewer');
  });

  it('follows your own pending request', () => {
    store().openEvent('m1');
    emit('subscribeMyRequest', 'm1', makeRequest());
    expect(store().myRequest).toEqual(makeRequest());
  });

  it('skips membership and request lookups for an account without an email', () => {
    useMeetingStore.setState({ user: makeViewer({ email: '' }) });
    const close = store().openEvent('m1');
    expect(repo.subscribeMyMembership).not.toHaveBeenCalled();
    expect(repo.subscribeMyRequest).not.toHaveBeenCalled();
    close();
  });

  it('closes everything, and ignores late updates', () => {
    const close = store().openEvent('m1');
    emit('subscribeAccessSettings', 'm1', makeAccess());
    close();
    for (const name of [
      'subscribeMeeting',
      'subscribeAccessSettings',
      'subscribeMyMembership',
      'subscribeMyRequest',
      'subscribeMembers',
      'subscribeRequests',
    ]) {
      expect(lastSub(name).off).toHaveBeenCalled();
    }
    expect(store()).toMatchObject({ openId: null, event: null, eventView: 'idle' });

    emit('subscribeMeeting', 'm1', meeting);
    emit('subscribeAccessSettings', 'm1', makeAccess());
    lastSub('subscribeMeeting', 'm1').denied?.(new Error('late'));
    expect(store().event).toBeNull();
  });

  it('closing an old event leaves a newer one open', () => {
    const closeFirst = store().openEvent('m1');
    lastSub('subscribeMeeting', 'm1').denied?.(new Error('permission_denied'));
    store().openEvent('m2');
    closeFirst();
    expect(store().openId).toBe('m2');
  });
});

describe('creating and managing your events', () => {
  beforeEach(() => openAsOwner());

  it('needs a signed-in user', async () => {
    useMeetingStore.setState({ user: null });
    await expect(store().saveDraft({ name: 'X', description: '' })).rejects.toThrow(
      'not bound to a user',
    );
  });

  it('saves a new draft and makes it current', async () => {
    useMeetingStore.setState({ currentMeeting: null });
    const id = await store().saveDraft({ name: 'Sprint review', description: 'Q3' });
    expect(id).toBe('new-id');
    expect(repo.createMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-id',
        owner: 'u1',
        ownerName: 'Ana',
        name: 'Sprint review',
        description: 'Q3',
        status: 'draft',
        goals: [],
      }),
    );
    expect(repo.setCurrentMeetingId).toHaveBeenCalledWith('u1', 'new-id');
  });

  it('fills in the current draft instead of making another', async () => {
    const draft = makeMeeting({ id: 'd1' });
    useMeetingStore.setState({ currentMeeting: draft });
    expect(await store().saveDraft({ name: 'Renamed', description: '' })).toBe('d1');
    expect(repo.patchMeeting).toHaveBeenCalledWith('d1', {
      name: 'Renamed',
      description: '',
    });
    expect(repo.createMeeting).not.toHaveBeenCalled();
  });

  it('deletes only your own events, letting go of the current one', async () => {
    await store().deleteEvent('m1');
    expect(repo.setCurrentMeetingId).toHaveBeenCalledWith('u1', null);
    expect(repo.deleteMeetingEverywhere).toHaveBeenCalledWith(meeting);

    vi.clearAllMocks();
    useMeetingStore.setState({ currentMeetingId: 'other' });
    await store().deleteEvent('m1');
    expect(repo.setCurrentMeetingId).not.toHaveBeenCalled();
    expect(repo.deleteMeetingEverywhere).toHaveBeenCalled();

    vi.clearAllMocks();
    useMeetingStore.setState({ meetings: [{ ...meeting, owner: 'someone-else' }] });
    await store().deleteEvent('m1');
    await store().deleteEvent('missing');
    expect(repo.deleteMeetingEverywhere).not.toHaveBeenCalled();
  });

  it('discards the current draft, with its shares when it is open', async () => {
    const draft = makeMeeting({ id: 'm1' });
    useMeetingStore.setState({
      currentMeeting: draft,
      members: [makeMember()],
      requests: [makeRequest()],
    });
    await store().discardCurrent();
    expect(repo.deleteMeeting).toHaveBeenCalledWith(
      draft,
      [makeMember()],
      [makeRequest()],
    );
    expect(repo.setCurrentMeetingId).toHaveBeenCalledWith('u1', null);

    vi.clearAllMocks();
    useMeetingStore.setState({ openId: 'elsewhere' });
    await store().discardCurrent();
    expect(repo.deleteMeeting).toHaveBeenCalledWith(draft, [], []);
  });

  it('only lets go of a current event that is not a draft', async () => {
    await store().discardCurrent();
    expect(repo.deleteMeeting).not.toHaveBeenCalled();
    expect(repo.setCurrentMeetingId).toHaveBeenCalledWith('u1', null);
  });

  it('reopens one of your events as current, and ignores others', async () => {
    await store().reopen('m1');
    expect(repo.setCurrentMeetingId).toHaveBeenCalledWith('u1', 'm1');
    vi.clearAllMocks();
    await store().reopen('not-mine');
    expect(repo.setCurrentMeetingId).not.toHaveBeenCalled();
  });

  it('reopens a cancelled event as a fresh draft with no completions', async () => {
    const cancelled = makeMeeting({ status: 'cancelled', goals: meeting.goals });
    useMeetingStore.setState({ meetings: [cancelled] });
    await store().reopenInDashboard('m1');
    expect(repo.resetProgress).toHaveBeenCalledWith('m1', cancelled.goals, {
      realStartTime: '',
      realEndTime: '',
      status: 'draft',
    });
    expect(repo.setCurrentMeetingId).toHaveBeenCalledWith('u1', 'm1');
  });

  it('reopens a finished event as running again', async () => {
    useMeetingStore.setState({
      meetings: [makeMeeting({ status: 'finished', realEndTime: T0 })],
    });
    await store().reopenInDashboard('m1');
    expect(repo.patchMeeting).toHaveBeenCalledWith('m1', {
      realEndTime: '',
      status: 'active',
    });
  });

  it('just points at an event that is already open', async () => {
    await store().reopenInDashboard('m1');
    expect(repo.patchMeeting).not.toHaveBeenCalled();
    expect(repo.resetProgress).not.toHaveBeenCalled();
    expect(repo.setCurrentMeetingId).toHaveBeenCalledWith('u1', 'm1');

    vi.clearAllMocks();
    await store().reopenInDashboard('missing');
    expect(repo.setCurrentMeetingId).not.toHaveBeenCalled();
  });

  it('copies an event as a fresh one, keeping its length, starting now', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-01T09:00:00.000Z'));
    const source = makeFinishedMeeting({
      sideTopics: [{ id: 't1', value: 'Budget', goalName: 'Review last week', key: 'k' }],
    });
    useMeetingStore.setState({ meetings: [source] });
    const id = await store().clone('m1');
    expect(id).toBe('new-id');
    const copy = vi.mocked(repo.createMeeting).mock.calls[0][0];
    expect(copy).toMatchObject({
      name: 'Weekly planning (copy)',
      expectedStartTime: toISO(new Date('2026-03-01T09:00:00.000Z')),
      expectedEndTime: toISO(new Date('2026-03-01T10:00:00.000Z')),
      status: 'draft',
    });
    expect(
      copy.goals.map((goal) => [goal.name, goal.finishedAt, goal.decisions]),
    ).toEqual([
      ['Review last week', '', ''],
      ['Pick priorities', '', ''],
    ]);
    expect(copy.goals[0].id).not.toBe('g1');
    expect(copy.sideTopics).toEqual([
      expect.objectContaining({ value: 'Budget', goalName: 'Review last week' }),
    ]);
    expect(copy.sideTopics[0]).not.toHaveProperty('key');
  });

  it('copies the open event (someone else’s), with a one-hour box when it had none', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const now = new Date('2026-03-01T09:00:00.000Z');
    vi.setSystemTime(now);
    const shared = makeMeeting({
      id: 's1',
      owner: 'u2',
      expectedStartTime: '',
      expectedEndTime: '',
    });
    useMeetingStore.setState({ meetings: [], event: shared });
    await store().clone('s1');
    expect(vi.mocked(repo.createMeeting).mock.calls[0][0]).toMatchObject({
      owner: 'u1',
      expectedEndTime: toISO(addHours(now, 1)),
    });

    vi.clearAllMocks();
    expect(await store().clone('missing')).toBeNull();
    expect(repo.createMeeting).not.toHaveBeenCalled();
  });

  it('creates an event from a template, its milestones fresh', async () => {
    const id = await store().createFromTemplate('Retro', ['Wins', 'Pains']);
    expect(id).toBe('new-id');
    const created = vi.mocked(repo.createMeeting).mock.calls[0][0];
    expect(created.name).toBe('Retro');
    expect(created.goals.map((goal) => goal.name)).toEqual(['Wins', 'Pains']);
    expect(repo.setCurrentMeetingId).toHaveBeenCalledWith('u1', 'new-id');
  });

  it('switches the language, saving it to the profile only when signed in', async () => {
    await store().chooseLocale('pt-BR');
    expect(useI18nStore.getState().locale).toBe('pt-BR');
    expect(repo.setUserLocale).toHaveBeenCalledWith('u1', 'pt-BR');

    vi.clearAllMocks();
    useMeetingStore.setState({ user: null });
    await store().chooseLocale('en-US');
    expect(useI18nStore.getState().locale).toBe('en-US');
    expect(repo.setUserLocale).not.toHaveBeenCalled();
  });

  it('saves the automatic-mode choice', async () => {
    await store().setAutomatic(false);
    expect(store().decisionsAutomaticBehavior).toBe(false);
    expect(repo.setAutomaticBehavior).toHaveBeenCalledWith('u1', false);
  });
});

describe('running the open event', () => {
  beforeEach(() => openAsOwner());

  it('edits its details', async () => {
    await store().updateMeeting({ name: 'Renamed' });
    expect(repo.patchMeeting).toHaveBeenCalledWith('m1', { name: 'Renamed' });
  });

  it('starts it now, keeping a schedule that was set', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T10:05:00.000Z'));
    await store().startMeeting();
    expect(repo.patchMeeting).toHaveBeenCalledWith('m1', {
      expectedStartTime: meeting.expectedStartTime,
      expectedEndTime: meeting.expectedEndTime,
      realStartTime: toISO(new Date('2026-01-01T10:05:00.000Z')),
      status: 'active',
    });
  });

  it('starts an unscheduled event now, in a one-hour box', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const now = new Date('2026-01-01T10:05:00.000Z');
    vi.setSystemTime(now);
    openAsOwner(makeMeeting({ expectedStartTime: '', expectedEndTime: '' }));
    await store().startMeeting();
    expect(repo.patchMeeting).toHaveBeenCalledWith('m1', {
      expectedStartTime: toISO(now),
      expectedEndTime: toISO(addHours(toISO(now), 1)),
      realStartTime: toISO(now),
      status: 'active',
    });
  });

  it('cancels it and lets go of it as current', async () => {
    await store().cancelMeeting();
    expect(repo.patchMeeting).toHaveBeenCalledWith('m1', {
      realEndTime: '',
      status: 'cancelled',
    });
    expect(repo.setCurrentMeetingId).toHaveBeenCalledWith('u1', null);
  });

  it('lets a contributor run someone else’s event without moving their own pointer', async () => {
    useMeetingStore.setState({
      role: 'contributor',
      meetings: [],
      currentMeetingId: null,
    });
    await store().cancelMeeting();
    expect(repo.patchMeeting).toHaveBeenCalled();
    expect(repo.setCurrentMeetingId).not.toHaveBeenCalled();

    vi.clearAllMocks();
    await store().backToDashboard();
    expect(repo.patchMeeting).toHaveBeenCalledWith('m1', {
      realEndTime: '',
      status: 'active',
    });
    expect(repo.setCurrentMeetingId).not.toHaveBeenCalled();
  });

  it('finishes it now', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T10:55:00.000Z'));
    await store().finishMeeting();
    expect(repo.patchMeeting).toHaveBeenCalledWith('m1', {
      realEndTime: toISO(new Date('2026-01-01T10:55:00.000Z')),
      status: 'finished',
    });
  });

  it('takes a finished event back to the board as current', async () => {
    await store().backToDashboard();
    expect(repo.patchMeeting).toHaveBeenCalledWith('m1', {
      realEndTime: '',
      status: 'active',
    });
    expect(repo.setCurrentMeetingId).toHaveBeenCalledWith('u1', 'm1');
  });

  it('changes nothing for a viewer', async () => {
    useMeetingStore.setState({ role: 'viewer' });
    const state = store();
    await state.updateMeeting({ name: 'Nope' });
    await state.startMeeting();
    await state.cancelMeeting();
    await state.finishMeeting();
    await state.backToDashboard();
    await state.updateGoal('g1', { finishedAt: '' });
    await state.addGoal('New');
    await state.removeGoal('g1');
    await state.duplicateGoal('g1');
    await state.moveGoal('g1', 1);
    await state.reorderGoals(0, 1);
    expect(state.addSideTopic('')).toBeNull();
    await state.updateSideTopic('k1', 'x');
    await state.removeSideTopic('k1');
    for (const write of [
      repo.patchMeeting,
      repo.patchGoal,
      repo.putGoal,
      repo.deleteGoal,
      repo.setGoalOrder,
      repo.putSideTopic,
      repo.setSideTopicValue,
      repo.deleteSideTopic,
      repo.setCurrentMeetingId,
    ]) {
      expect(write).not.toHaveBeenCalled();
    }
  });

  it('changes nothing with no event open', async () => {
    useMeetingStore.setState({ event: null });
    await store().updateMeeting({ name: 'Nope' });
    expect(repo.patchMeeting).not.toHaveBeenCalled();
  });
});

describe('milestones', () => {
  const goals = [
    makeGoal({ id: 'g1', name: 'One' }),
    makeGoal({ id: 'g2', name: 'Two', weight: 2 }),
    makeGoal({ id: 'g3', name: 'Three' }),
  ];
  beforeEach(() => openAsOwner(makeLiveMeeting({ goals })));

  it('writes one goal at a time, never its id', async () => {
    await store().updateGoal('g2', { id: 'ignored', finishedAt: '2026-01-01T10:20:00Z' });
    expect(repo.patchGoal).toHaveBeenCalledWith('m1', 'g2', {
      finishedAt: '2026-01-01T10:20:00Z',
    });
  });

  it('adds one at the end, with weight 1 unless given', async () => {
    await store().addGoal('Four');
    expect(repo.putGoal).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({ name: 'Four', weight: 1 }),
      3,
    );
    await store().addGoal('Five', 3);
    expect(repo.putGoal).toHaveBeenLastCalledWith(
      'm1',
      expect.objectContaining({ name: 'Five', weight: 3 }),
      3,
    );
  });

  it('removes one', async () => {
    await store().removeGoal('g2');
    expect(repo.deleteGoal).toHaveBeenCalledWith('m1', 'g2');
  });

  it('duplicates one right after itself, as not started', async () => {
    await store().duplicateGoal('g2');
    const copy = vi.mocked(repo.putGoal).mock.calls[0][1];
    expect(copy).toMatchObject({ name: 'Two', weight: 2, finishedAt: '', decisions: '' });
    expect(repo.putGoal).toHaveBeenCalledWith('m1', copy, 2);
    expect(
      vi.mocked(repo.setGoalOrder).mock.calls[0][1].map((goal) => goal.name),
    ).toEqual(['One', 'Two', 'Two', 'Three']);

    vi.clearAllMocks();
    await store().duplicateGoal('missing');
    expect(repo.putGoal).not.toHaveBeenCalled();
  });

  it('moves one up or down, and ignores an unknown one', async () => {
    await store().moveGoal('g1', 1);
    expect(vi.mocked(repo.setGoalOrder).mock.calls[0][1].map((goal) => goal.id)).toEqual([
      'g2',
      'g1',
      'g3',
    ]);
    vi.clearAllMocks();
    await store().moveGoal('missing', 1);
    expect(repo.setGoalOrder).not.toHaveBeenCalled();
  });

  it('reorders by position', async () => {
    await store().reorderGoals(2, 0);
    expect(vi.mocked(repo.setGoalOrder).mock.calls[0][1].map((goal) => goal.id)).toEqual([
      'g3',
      'g1',
      'g2',
    ]);
  });
});

describe('side topics', () => {
  beforeEach(() => openAsOwner());

  it('parks one under the current milestone and returns its key', () => {
    expect(store().addSideTopic('Pick priorities')).toBe('topic-key');
    expect(repo.putSideTopic).toHaveBeenCalledWith(
      'm1',
      'topic-key',
      expect.objectContaining({ value: '', goalName: 'Pick priorities' }),
    );
  });

  it('edits and removes one by key', async () => {
    await store().updateSideTopic('k1', 'Budget');
    await store().removeSideTopic('k1');
    expect(repo.setSideTopicValue).toHaveBeenCalledWith('m1', 'k1', 'Budget');
    expect(repo.deleteSideTopic).toHaveBeenCalledWith('m1', 'k1');
  });
});

describe('sharing', () => {
  beforeEach(() => openAsOwner());

  it('lets the owner set visibility, share, change roles and unshare', async () => {
    const member = makeMember();
    await store().setVisibility('public', 'contributor');
    await store().shareWith('bruno@example.com', 'viewer');
    await store().setMemberRole(member, 'contributor');
    await store().unshare(member);
    expect(repo.setVisibility).toHaveBeenCalledWith('m1', 'public', 'contributor');
    expect(repo.shareWith).toHaveBeenCalledWith('m1', 'bruno@example.com', 'viewer');
    expect(repo.setMemberRole).toHaveBeenCalledWith('m1', member, 'contributor');
    expect(repo.unshare).toHaveBeenCalledWith('m1', member.key);
  });

  it('lets the owner approve or deny requests', async () => {
    const request = makeRequest();
    await store().approveRequest(request, 'contributor');
    await store().denyRequest(request);
    expect(repo.approveRequest).toHaveBeenCalledWith('m1', 'u1', request, 'contributor');
    expect(repo.denyRequest).toHaveBeenCalledWith('m1', 'u1', request);
  });

  it('lets nobody else do any of it', async () => {
    useMeetingStore.setState({ role: 'contributor' });
    const state = store();
    await state.setVisibility('public', 'viewer');
    await state.shareWith('c@x.com', 'viewer');
    await state.setMemberRole(makeMember(), 'viewer');
    await state.unshare(makeMember());
    await state.approveRequest(makeRequest(), 'viewer');
    await state.denyRequest(makeRequest());
    for (const write of [
      repo.setVisibility,
      repo.shareWith,
      repo.setMemberRole,
      repo.unshare,
      repo.approveRequest,
      repo.denyRequest,
    ]) {
      expect(write).not.toHaveBeenCalled();
    }
  });
});

describe('asking for access', () => {
  beforeEach(() => {
    useMeetingStore.setState({
      user,
      openId: 's1',
      access: makeAccess({ owner: 'u2' }),
      role: null,
    });
  });

  it('files a request as you, to the event’s owner', async () => {
    await store().requestAccess('Can I join?');
    expect(repo.requestAccess).toHaveBeenCalledWith(
      's1',
      'u2',
      'u1',
      { email: 'ana@example.com', name: 'Ana', photoURL: '' },
      'Can I join?',
    );
  });

  it('withdraws it', async () => {
    await store().cancelAccessRequest();
    expect(repo.cancelAccessRequest).toHaveBeenCalledWith(
      's1',
      'u2',
      'u1',
      'ana@example.com',
    );
  });

  it('needs an open event with known access settings', async () => {
    useMeetingStore.setState({ access: null });
    await expect(store().requestAccess('hi')).rejects.toThrow(
      'can’t take access requests',
    );
    await store().cancelAccessRequest();
    expect(repo.cancelAccessRequest).not.toHaveBeenCalled();
  });
});
