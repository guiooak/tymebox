import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The thin layer over the Realtime Database SDK: each helper builds the right
 * reference or query and turns snapshots into plain values.
 */

const snapshot = (value: unknown) => ({
  exists: () => value !== null && value !== undefined,
  val: () => value,
});

const sdk = vi.hoisted(() => ({
  ref: vi.fn((_db: unknown, path?: string) => ({ path: path ?? '' })),
  child: vi.fn((parent: { path: string }, path: string) => ({
    path: `${parent.path}/${path}`,
  })),
  get: vi.fn(),
  query: vi.fn((target: { path: string }, ...constraints: unknown[]) => ({
    target,
    constraints,
  })),
  orderByChild: vi.fn((field: string) => ({ orderByChild: field })),
  equalTo: vi.fn((value: string) => ({ equalTo: value })),
  update: vi.fn(async () => {}),
  remove: vi.fn(async () => {}),
  push: vi.fn(),
  onValue: vi.fn(),
}));

vi.mock('firebase/database', () => sdk);
vi.mock('./firebaseApp', () => ({ getDb: () => 'db' }));

const database = await import('./database');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reading once', () => {
  it('returns the value, or null when nothing is there', async () => {
    sdk.get.mockResolvedValueOnce(snapshot({ a: 1 }));
    expect(await database.read('users/u1')).toEqual({ a: 1 });
    expect(sdk.ref).toHaveBeenCalledWith('db', 'users/u1');

    sdk.get.mockResolvedValueOnce(snapshot(null));
    expect(await database.read('users/u2')).toBeNull();
  });

  it('reads the children matching a field', async () => {
    sdk.get.mockResolvedValueOnce(snapshot({ m1: { owner: 'u1' } }));
    expect(await database.readWhere('meetings', 'owner', 'u1')).toEqual({
      m1: { owner: 'u1' },
    });
    expect(sdk.query).toHaveBeenCalledWith(
      { path: 'meetings' },
      { orderByChild: 'owner' },
      { equalTo: 'u1' },
    );

    sdk.get.mockResolvedValueOnce(snapshot(null));
    expect(await database.readWhere('meetings', 'owner', 'nobody')).toBeNull();
  });
});

describe('writing', () => {
  it('merges into a path, removes it, or writes several paths at once', async () => {
    await database.updateAt('users/u1', { a: 1 });
    await database.removeAt('users/u1/visited/x');
    await database.writeMany({ 'a/b': 1, 'c/d': null });
    expect(sdk.update).toHaveBeenNthCalledWith(1, { path: 'users/u1' }, { a: 1 });
    expect(sdk.remove).toHaveBeenCalledWith({ path: 'users/u1/visited/x' });
    expect(sdk.update).toHaveBeenNthCalledWith(
      2,
      { path: '' },
      { 'a/b': 1, 'c/d': null },
    );
  });

  it('reserves a new key under a path, and fails loudly without one', () => {
    sdk.push.mockReturnValueOnce({ key: '-Nabc' });
    expect(database.newKey('meetings')).toBe('-Nabc');
    expect(sdk.child).toHaveBeenCalledWith({ path: '' }, 'meetings');

    sdk.push.mockReturnValueOnce({ key: null });
    expect(() => database.newKey('meetings')).toThrow(
      'Failed to generate a database key',
    );
  });
});

describe('live subscriptions', () => {
  type Listener = [unknown, (snap: unknown) => void, (error: Error) => void];

  it('calls back with each value or null, and reports a refusal', () => {
    const off = vi.fn();
    sdk.onValue.mockReturnValueOnce(off);
    const callback = vi.fn();
    const denied = vi.fn();
    expect(database.subscribe('meetings/m1', callback, denied)).toBe(off);

    const [target, onData, onError] = sdk.onValue.mock.calls[0] as unknown as Listener;
    expect(target).toEqual({ path: 'meetings/m1' });
    onData(snapshot({ name: 'X' }));
    onData(snapshot(null));
    expect(callback.mock.calls).toEqual([[{ name: 'X' }], [null]]);
    onError(new Error('permission_denied'));
    expect(denied).toHaveBeenCalledWith(new Error('permission_denied'));
  });

  it('ignores a refusal nobody listens for', () => {
    database.subscribe('meetings/m1', vi.fn());
    const [, , onError] = sdk.onValue.mock.calls[0] as unknown as Listener;
    expect(() => onError(new Error('permission_denied'))).not.toThrow();
  });

  it('follows the children matching a field', () => {
    const callback = vi.fn();
    const denied = vi.fn();
    database.subscribeWhere('meetings', 'owner', 'u1', callback, denied);
    const [target, onData, onError] = sdk.onValue.mock.calls[0] as unknown as Listener;
    expect(target).toEqual({
      target: { path: 'meetings' },
      constraints: [{ orderByChild: 'owner' }, { equalTo: 'u1' }],
    });
    onData(snapshot({ m1: {} }));
    onData(snapshot(null));
    expect(callback.mock.calls).toEqual([[{ m1: {} }], [null]]);
    onError(new Error('nope'));
    expect(denied).toHaveBeenCalled();

    database.subscribeWhere('meetings', 'owner', 'u1', vi.fn());
    const [, , silent] = sdk.onValue.mock.calls[1] as unknown as Listener;
    expect(() => silent(new Error('nope'))).not.toThrow();
  });
});
