import {
  fromLegacy,
  goalsToRecord,
  normalizeMeeting,
  toGoals,
  toStoredMeeting,
} from './meetingShape';

const goal = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id.toUpperCase(),
  weight: 1,
  finishedAt: '',
  decisions: '',
  ...extra,
});

describe('toGoals', () => {
  it('reads the old array shape in its order', () => {
    expect(toGoals([goal('a'), null, goal('b')]).map((g) => g.id)).toEqual(['a', 'b']);
  });

  it('orders a keyed map by `order`, whatever the key order', () => {
    const goals = toGoals({
      z: goal('z', { order: 0 }),
      a: goal('a', { order: 2 }),
      m: goal('m', { order: 1 }),
    });
    expect(goals.map((g) => g.id)).toEqual(['z', 'm', 'a']);
  });

  it('falls back to the key for a goal stored without an id', () => {
    expect(toGoals({ k1: { name: 'X', order: 0 } })[0]).toMatchObject({
      id: 'k1',
      weight: 1,
    });
  });
});

describe('goalsToRecord', () => {
  it('keys goals by id and records their position', () => {
    const record = goalsToRecord(toGoals([goal('a'), goal('b')]));
    expect(Object.keys(record)).toEqual(['a', 'b']);
    expect(record.b.order).toBe(1);
    expect(toGoals(record).map((g) => g.id)).toEqual(['a', 'b']);
  });
});

describe('fromLegacy', () => {
  const legacy = {
    id: 'm1',
    name: 'Planning',
    status: 'finished' as const,
    realStartTime: '2026-10-14T09:54:00Z',
    goals: [goal('g1', { finishedAt: '2026-10-14T09:56:00Z' }), goal('g2')],
    sideTopics: [{ id: 't1', value: 'CI', goalName: 'G1' }],
  };

  it('keeps the id, data and order and records the owner', () => {
    const stored = fromLegacy(legacy, 'm1', 'uid-1', 'Ana');
    expect(stored).toMatchObject({
      id: 'm1',
      owner: 'uid-1',
      ownerName: 'Ana',
      name: 'Planning',
    });
    expect(stored.goals.g1).toMatchObject({
      finishedAt: '2026-10-14T09:56:00Z',
      order: 0,
    });
    expect(stored.goals.g2.order).toBe(1);
    expect(stored.sideTopics['0']).toEqual({ id: 't1', value: 'CI', goalName: 'G1' });
  });

  it('reads back to the same event', () => {
    const meeting = normalizeMeeting(fromLegacy(legacy, 'm1', 'uid-1', 'Ana'), 'm1');
    expect(meeting.goals.map((g) => g.id)).toEqual(['g1', 'g2']);
    expect(meeting.sideTopics.map((t) => t.value)).toEqual(['CI']);
    expect(meeting.status).toBe('finished');
  });

  it('trims values past today\u2019s limits so the move is never refused', () => {
    const stored = fromLegacy(
      {
        name: 'x'.repeat(300),
        goals: [goal('g1', { weight: 500, name: 'y'.repeat(600) })],
      },
      'm2',
      'uid-1',
      'Ana',
    );
    expect(stored.name).toHaveLength(200);
    expect(stored.goals.g1.name).toHaveLength(500);
    expect(stored.goals.g1.weight).toBe(100);
  });
});

describe('reading partial data', () => {
  it('fills every missing goal field', () => {
    expect(toGoals({ k: {} })).toEqual([
      { id: 'k', name: '', weight: 1, finishedAt: '', decisions: '' },
    ]);
  });

  it('breaks an `order` tie by key, in either direction', () => {
    const tied = toGoals({
      b: goal('b', { order: 1 }),
      a: goal('a', { order: 1 }),
      c: goal('c', { order: 1 }),
    });
    expect(tied.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('turns an empty node into a blank draft', () => {
    expect(normalizeMeeting({})).toEqual({
      id: '',
      owner: '',
      ownerName: '',
      name: '',
      description: '',
      expectedStartTime: '',
      expectedEndTime: '',
      realStartTime: '',
      realEndTime: '',
      goals: [],
      sideTopics: [],
      status: 'draft',
      createdAt: '',
      updatedAt: '',
    });
    expect(normalizeMeeting({ id: 'own-id', status: 'archived' as never })).toMatchObject(
      {
        id: 'own-id',
        status: 'draft',
      },
    );
  });
});

describe('toStoredMeeting', () => {
  it('stores topics under their key, or their position when new', () => {
    const stored = toStoredMeeting(
      normalizeMeeting({
        sideTopics: { k1: { id: 't1', value: 'Kept', goalName: '' } } as never,
      }),
    );
    expect(stored.sideTopics).toEqual({ k1: { id: 't1', value: 'Kept', goalName: '' } });

    const fresh = toStoredMeeting({
      ...normalizeMeeting({}),
      sideTopics: [{ id: 't2', value: 'New', goalName: '' }],
    });
    expect(fresh.sideTopics).toEqual({ 0: { id: 't2', value: 'New', goalName: '' } });
  });
});
