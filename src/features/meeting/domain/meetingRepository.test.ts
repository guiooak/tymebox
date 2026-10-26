import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toISO } from '../../../common/services/datetime';
import { makeGoal, makeMeeting, makeMember, makeRequest } from '../../../test/fixtures';

/*
 * The repository maps the app's operations onto database paths. With the
 * database service replaced, each test checks the exact paths and values
 * written, and how raw data read back is cleaned up into the app's types.
 * (Whether the rules allow those writes is tested against the emulator.)
 */

type Sub = { path: string; callback: (value: unknown) => void; denied?: () => void };
const subs: Sub[] = [];
const off = vi.fn();

vi.mock('../../../common/services/database', () => ({
  read: vi.fn(async () => null),
  readWhere: vi.fn(async () => null),
  writeMany: vi.fn(async () => {}),
  updateAt: vi.fn(async () => {}),
  removeAt: vi.fn(async () => {}),
  newKey: vi.fn((path: string) => `key-under-${path}`),
  subscribe: vi.fn((path: string, callback: Sub['callback'], denied?: () => void) => {
    subs.push({ path, callback, denied });
    return off;
  }),
  subscribeWhere: vi.fn(
    (path: string, field: string, value: string, callback: Sub['callback']) => {
      subs.push({ path: `${path}?${field}=${value}`, callback });
      return off;
    },
  ),
}));

const db = await import('../../../common/services/database');
const repo = await import('./meetingRepository');

const NOW = new Date('2026-01-01T10:30:00.000Z');
const nowIso = () => toISO(NOW);

/** The callback registered for a path (the latest one). */
function sub(path: string): Sub {
  const found = subs.filter((item) => item.path === path).at(-1);
  if (!found) {
    throw new Error(`Nothing subscribed to ${path}`);
  }
  return found;
}

beforeEach(() => {
  vi.clearAllMocks();
  subs.length = 0;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('your profile', () => {
  it('reads it with defaults for anything missing', () => {
    const callback = vi.fn();
    expect(repo.subscribeUserData('u1', callback)).toBe(off);
    sub('users/u1').callback(null);
    expect(callback).toHaveBeenLastCalledWith({
      currentMeetingId: null,
      decisionsAutomaticBehavior: true,
      locale: null,
      visitedIds: [],
      legacy: {},
    });
  });

  it('reads what is saved, ignoring an unknown language', () => {
    const callback = vi.fn();
    repo.subscribeUserData('u1', callback);
    sub('users/u1').callback({
      currentMeetingId: 'm1',
      settings: { decisionsAutomaticBehavior: false, locale: 'pt-BR' },
      visited: { s1: 1, s2: 2 },
    });
    expect(callback).toHaveBeenLastCalledWith(
      expect.objectContaining({
        currentMeetingId: 'm1',
        decisionsAutomaticBehavior: false,
        locale: 'pt-BR',
        visitedIds: ['s1', 's2'],
      }),
    );

    sub('users/u1').callback({ settings: { locale: 'fr-FR' } });
    expect(callback.mock.lastCall?.[0].locale).toBeNull();
  });

  it('finds old per-user events, stored as an object or an array with gaps', () => {
    const callback = vi.fn();
    repo.subscribeUserData('u1', callback);
    sub('users/u1').callback({ meetings: { a: { name: 'A' }, b: null } });
    expect(callback.mock.lastCall?.[0].legacy).toEqual({ a: { name: 'A' } });

    sub('users/u1').callback({ meetings: [{ id: 'x', name: 'X' }, null, { name: 'Y' }] });
    expect(callback.mock.lastCall?.[0].legacy).toEqual({
      x: { id: 'x', name: 'X' },
      2: { name: 'Y' },
    });
  });

  it('saves the current event, language, automatic mode and visits', async () => {
    await repo.setCurrentMeetingId('u1', 'm1');
    await repo.setUserLocale('u1', 'pt-BR');
    await repo.setAutomaticBehavior('u1', false);
    await repo.recordVisit('u1', 's1');
    await repo.forgetVisit('u1', 's1');
    expect(vi.mocked(db.updateAt).mock.calls).toEqual([
      ['users/u1', { currentMeetingId: 'm1' }],
      ['users/u1/settings', { locale: 'pt-BR' }],
      ['users/u1/settings', { decisionsAutomaticBehavior: false }],
      ['users/u1/visited', { s1: NOW.getTime() }],
      ['users/u1/visited', { s1: null }],
    ]);
  });

  it('moves old events to shared storage one by one, carrying on past a refusal', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(db.writeMany)
      .mockRejectedValueOnce(new Error('already there'))
      .mockResolvedValueOnce(undefined);
    await repo.migrateLegacyMeetings('u1', 'Ana', {
      a: { name: 'A' },
      b: { name: 'B' },
    });
    expect(db.writeMany).toHaveBeenCalledTimes(2);
    expect(vi.mocked(db.writeMany).mock.calls[1][0]).toMatchObject({
      'meetings/b': expect.objectContaining({
        id: 'b',
        owner: 'u1',
        ownerName: 'Ana',
        name: 'B',
      }),
      'meetingAccess/b': { owner: 'u1', visibility: 'private', publicRole: 'viewer' },
      'users/u1/meetings/b': null,
    });
    expect(warn).toHaveBeenCalledWith(
      'Could not move event a to shared storage',
      expect.any(Error),
    );
    warn.mockRestore();
  });
});

describe('lists', () => {
  it('lists your own events, cleaned up', () => {
    const callback = vi.fn();
    repo.subscribeOwnMeetings('u1', callback);
    sub('meetings?owner=u1').callback({ m1: { owner: 'u1', name: 'Planning' } });
    expect(callback.mock.lastCall?.[0]).toEqual([
      expect.objectContaining({ id: 'm1', name: 'Planning', goals: [], sideTopics: [] }),
    ]);
    sub('meetings?owner=u1').callback(null);
    expect(callback).toHaveBeenLastCalledWith([]);
  });

  it('lists events shared with an email, newest first, roles made safe', () => {
    const callback = vi.fn();
    repo.subscribeSharedWith('Bruno.Silva@Example.com', callback);
    sub('sharedWith/bruno,silva@example,com').callback({
      old: { addedAt: 1, role: 'contributor' },
      new: { addedAt: 5, role: 'admin' },
      odd: {},
    });
    expect(callback).toHaveBeenLastCalledWith([
      { id: 'new', role: 'viewer', addedAt: 5 },
      { id: 'old', role: 'contributor', addedAt: 1 },
      { id: 'odd', role: 'viewer', addedAt: 0 },
    ]);
    sub('sharedWith/bruno,silva@example,com').callback(null);
    expect(callback).toHaveBeenLastCalledWith([]);
  });

  it('counts pending requests per event', () => {
    const callback = vi.fn();
    repo.subscribeRequestsByOwner('u1', callback);
    sub('requestsByOwner/u1').callback({ m1: { a: true, b: true }, m2: { c: true } });
    expect(callback).toHaveBeenLastCalledWith({ m1: 2, m2: 1 });
    sub('requestsByOwner/u1').callback(null);
    expect(callback).toHaveBeenLastCalledWith({});
  });
});

describe('one event', () => {
  it('reserves ids under meetings', () => {
    expect(repo.newMeetingId()).toBe('key-under-meetings');
    expect(repo.newSideTopicKey('m1')).toBe('key-under-meetings/m1/sideTopics');
  });

  it('follows an event, null when it is gone, and reports a refusal', () => {
    const callback = vi.fn();
    const denied = vi.fn();
    repo.subscribeMeeting('m1', callback, denied);
    sub('meetings/m1').callback({ owner: 'u1', name: 'Planning' });
    expect(callback.mock.lastCall?.[0]).toMatchObject({ id: 'm1', name: 'Planning' });
    sub('meetings/m1').callback(null);
    expect(callback).toHaveBeenLastCalledWith(null);
    sub('meetings/m1').denied?.();
    expect(denied).toHaveBeenCalled();
  });

  it('creates an event with its private access settings, stamped now', async () => {
    const meeting = makeMeeting({ createdAt: '', updatedAt: '' });
    await repo.createMeeting(meeting);
    const written = vi.mocked(db.writeMany).mock.calls[0][0];
    expect(written['meetingAccess/m1']).toEqual({
      owner: 'u1',
      visibility: 'private',
      publicRole: 'viewer',
    });
    expect(written['meetings/m1']).toMatchObject({
      id: 'm1',
      owner: 'u1',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  });

  it('deletes an event with its shares and requests', async () => {
    await repo.deleteMeeting(makeMeeting(), [makeMember()], [makeRequest()]);
    expect(db.writeMany).toHaveBeenCalledWith({
      'meetings/m1': null,
      'meetingAccess/m1': null,
      'sharedWith/bruno@example,com/m1': null,
      'accessRequests/m1/carla@example,com': null,
      'requestsByOwner/u1/m1/carla@example,com': null,
    });
  });

  it('looks up shares and requests before deleting everywhere', async () => {
    vi.mocked(db.read).mockImplementation(async (path: string) =>
      path === 'meetingAccess/m1/members' ? { 'b@x,com': {} } : null,
    );
    await repo.deleteMeetingEverywhere(makeMeeting());
    expect(db.writeMany).toHaveBeenCalledWith({
      'meetings/m1': null,
      'meetingAccess/m1': null,
      'sharedWith/b@x,com/m1': null,
    });
    vi.mocked(db.read).mockReset();
  });

  it('changes top-level fields with a fresh updatedAt', async () => {
    await repo.patchMeeting('m1', { name: 'Renamed' });
    expect(db.updateAt).toHaveBeenCalledWith('meetings/m1', {
      name: 'Renamed',
      updatedAt: nowIso(),
    });
  });

  it('writes goals one at a time', async () => {
    const goal = makeGoal({ id: 'g9', name: 'New' });
    await repo.putGoal('m1', goal, 3);
    await repo.patchGoal('m1', 'g9', { finishedAt: 'x', decisions: 'y' });
    await repo.deleteGoal('m1', 'g9');
    await repo.setGoalOrder('m1', [makeGoal({ id: 'a' }), makeGoal({ id: 'b' })]);
    await repo.resetProgress('m1', [makeGoal({ id: 'a' })], { status: 'draft' });
    expect(vi.mocked(db.updateAt).mock.calls.map(([, changes]) => changes)).toEqual([
      { 'goals/g9': { ...goal, order: 3 }, updatedAt: nowIso() },
      { 'goals/g9/finishedAt': 'x', 'goals/g9/decisions': 'y', updatedAt: nowIso() },
      { 'goals/g9': null, updatedAt: nowIso() },
      { 'goals/a/order': 0, 'goals/b/order': 1, updatedAt: nowIso() },
      { status: 'draft', 'goals/a/finishedAt': '', updatedAt: nowIso() },
    ]);
  });

  it('writes side topics one at a time, without their key', async () => {
    await repo.putSideTopic('m1', 'k1', {
      id: 't1',
      value: 'v',
      goalName: 'G',
      key: 'k1',
    });
    await repo.setSideTopicValue('m1', 'k1', 'changed');
    await repo.deleteSideTopic('m1', 'k1');
    expect(vi.mocked(db.updateAt).mock.calls.map(([, changes]) => changes)).toEqual([
      { 'sideTopics/k1': { id: 't1', value: 'v', goalName: 'G' }, updatedAt: nowIso() },
      { 'sideTopics/k1/value': 'changed', updatedAt: nowIso() },
      { 'sideTopics/k1': null, updatedAt: nowIso() },
    ]);
  });
});

describe('access settings', () => {
  it('reports once all three parts are known, with safe values', () => {
    const callback = vi.fn();
    const stop = repo.subscribeAccessSettings('m1', callback);
    sub('meetingAccess/m1/owner').callback('u1');
    sub('meetingAccess/m1/visibility').callback('public');
    expect(callback).not.toHaveBeenCalled();
    sub('meetingAccess/m1/publicRole').callback('contributor');
    expect(callback).toHaveBeenLastCalledWith({
      owner: 'u1',
      visibility: 'public',
      publicRole: 'contributor',
    });

    sub('meetingAccess/m1/visibility').callback('weird');
    sub('meetingAccess/m1/publicRole').callback('admin');
    expect(callback).toHaveBeenLastCalledWith({
      owner: 'u1',
      visibility: 'private',
      publicRole: 'viewer',
    });

    sub('meetingAccess/m1/owner').callback(null);
    expect(callback).toHaveBeenLastCalledWith(null);

    stop();
    expect(off).toHaveBeenCalledTimes(3);
  });

  it('reads your own membership', () => {
    const callback = vi.fn();
    repo.subscribeMyMembership('m1', 'Bruno@example.com', callback);
    sub('meetingAccess/m1/members/bruno@example,com').callback({
      email: 'bruno@example.com',
      role: 'contributor',
      addedAt: 3,
    });
    expect(callback).toHaveBeenLastCalledWith({
      key: 'bruno@example,com',
      email: 'bruno@example.com',
      role: 'contributor',
      addedAt: 3,
    });
    sub('meetingAccess/m1/members/bruno@example,com').callback(null);
    expect(callback).toHaveBeenLastCalledWith(null);
  });

  it('lists members oldest first, with defaults, and none when refused', () => {
    const callback = vi.fn();
    repo.subscribeMembers('m1', callback);
    sub('meetingAccess/m1/members').callback({
      late: { email: 'l@x.com', role: 'viewer', addedAt: 9 },
      bare: {},
    });
    expect(callback).toHaveBeenLastCalledWith([
      { key: 'bare', email: '', role: 'viewer', addedAt: 0 },
      { key: 'late', email: 'l@x.com', role: 'viewer', addedAt: 9 },
    ]);
    sub('meetingAccess/m1/members').callback(null);
    expect(callback).toHaveBeenLastCalledWith([]);
    sub('meetingAccess/m1/members').denied?.();
    expect(callback).toHaveBeenLastCalledWith([]);
  });

  it('shares, changes roles, unshares and sets visibility', async () => {
    await repo.setVisibility('m1', 'public', 'viewer');
    expect(db.updateAt).toHaveBeenCalledWith('meetingAccess/m1', {
      visibility: 'public',
      publicRole: 'viewer',
    });

    await repo.shareWith('m1', '  Bruno@Example.com ', 'contributor');
    await repo.setMemberRole('m1', makeMember(), 'contributor');
    await repo.unshare('m1', 'bruno@example,com');
    expect(vi.mocked(db.writeMany).mock.calls.map(([changes]) => changes)).toEqual([
      {
        'meetingAccess/m1/members/bruno@example,com': {
          email: 'Bruno@Example.com',
          role: 'contributor',
          addedAt: NOW.getTime(),
        },
        'sharedWith/bruno@example,com/m1': {
          addedAt: NOW.getTime(),
          role: 'contributor',
        },
      },
      {
        'meetingAccess/m1/members/bruno@example,com/role': 'contributor',
        'sharedWith/bruno@example,com/m1/role': 'contributor',
      },
      {
        'meetingAccess/m1/members/bruno@example,com': null,
        'sharedWith/bruno@example,com/m1': null,
      },
    ]);
  });
});

describe('access requests', () => {
  const DAY = 24 * 60 * 60 * 1000;

  it('files a request with its index entries, keeping only a Google photo', async () => {
    await repo.requestAccess(
      's1',
      'u2',
      'u1',
      { email: 'Ana@example.com', name: 'Ana', photoURL: 'https://evil.example/x.png' },
      '  hi  ',
    );
    expect(db.writeMany).toHaveBeenCalledWith({
      'users/u1/requested/s1': true,
      'accessRequests/s1/ana@example,com': {
        email: 'Ana@example.com',
        name: 'Ana',
        photoURL: '',
        message: 'hi',
        requestedAt: NOW.getTime(),
      },
      'requestsByOwner/u2/s1/ana@example,com': true,
    });
  });

  it('withdraws one everywhere', async () => {
    await repo.cancelAccessRequest('s1', 'u2', 'u1', 'ana@example.com');
    expect(db.writeMany).toHaveBeenCalledWith({
      'users/u1/requested/s1': null,
      'accessRequests/s1/ana@example,com': null,
      'requestsByOwner/u2/s1/ana@example,com': null,
    });
  });

  it('follows your own request, hiding it once expired or refused', () => {
    const callback = vi.fn();
    repo.subscribeMyRequest('s1', 'ana@example.com', callback);
    const path = 'accessRequests/s1/ana@example,com';
    sub(path).callback({ email: 'ana@example.com', requestedAt: NOW.getTime() - DAY });
    expect(callback.mock.lastCall?.[0]).toMatchObject({
      key: 'ana@example,com',
      name: '',
    });
    sub(path).callback({ requestedAt: NOW.getTime() - 31 * DAY });
    expect(callback).toHaveBeenLastCalledWith(null);
    sub(path).callback(null);
    expect(callback).toHaveBeenLastCalledWith(null);
    sub(path).denied?.();
    expect(callback).toHaveBeenLastCalledWith(null);
  });

  it('lists an event’s current requests, newest first, none when refused', () => {
    const callback = vi.fn();
    repo.subscribeRequests('m1', callback);
    sub('accessRequests/m1').callback({
      a: {
        email: 'a@x.com',
        name: 'A',
        photoURL: 'p',
        message: 'm',
        requestedAt: NOW.getTime() - DAY,
      },
      b: { requestedAt: NOW.getTime() },
      old: { requestedAt: NOW.getTime() - 40 * DAY },
    });
    expect(
      callback.mock.lastCall?.[0].map((request: { key: string }) => request.key),
    ).toEqual(['b', 'a']);
    sub('accessRequests/m1').callback(null);
    expect(callback).toHaveBeenLastCalledWith([]);
    sub('accessRequests/m1').denied?.();
    expect(callback).toHaveBeenLastCalledWith([]);
  });

  it('approves a request into a membership, or denies it', async () => {
    const request = makeRequest();
    await repo.approveRequest('m1', 'u1', request, 'viewer');
    await repo.denyRequest('m1', 'u1', request);
    expect(vi.mocked(db.writeMany).mock.calls.map(([changes]) => changes)).toEqual([
      {
        'meetingAccess/m1/members/carla@example,com': {
          email: 'carla@example.com',
          role: 'viewer',
          addedAt: NOW.getTime(),
        },
        'sharedWith/carla@example,com/m1': { addedAt: NOW.getTime(), role: 'viewer' },
        'accessRequests/m1/carla@example,com': null,
        'requestsByOwner/u1/m1/carla@example,com': null,
      },
      {
        'accessRequests/m1/carla@example,com': null,
        'requestsByOwner/u1/m1/carla@example,com': null,
      },
    ]);
  });
});
