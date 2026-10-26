const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const tree: Record<string, unknown> = {};
let written: Record<string, unknown> | null = null;

function at(path: string): unknown {
  return path
    .split('/')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      tree,
    );
}

vi.mock('../../../common/services/database', () => ({
  read: vi.fn(async (path: string) => {
    if (path === 'accessRequests/deleted-event') {
      throw new Error('permission_denied');
    }
    return at(path) ?? null;
  }),
  writeMany: vi.fn(async (changes: Record<string, unknown>) => {
    written = changes;
  }),
  write: vi.fn(),
  updateAt: vi.fn(),
  removeAt: vi.fn(),
  subscribe: vi.fn(),
  subscribeWhere: vi.fn(),
  newKey: vi.fn(),
}));

const { expireRequests, isExpiredRequest } = await import('./meetingRepository');

beforeEach(() => {
  written = null;
  for (const name of Object.keys(tree)) {
    delete tree[name];
  }
  Object.assign(tree, {
    accessRequests: {
      e1: {
        'old@x,com': { email: 'old@x.com', requestedAt: now - 31 * DAY },
        'new@x,com': { email: 'new@x.com', requestedAt: now - 2 * DAY },
      },
    },
    requestsByOwner: {
      me: {
        e1: { 'old@x,com': true, 'new@x,com': true, 'gone@x,com': true },
        'deleted-event': { 'a@x,com': true },
      },
    },
  });
});

describe('access request expiry', () => {
  it('expires a request after 30 days', () => {
    expect(isExpiredRequest({ requestedAt: now - 29 * DAY }, now)).toBe(false);
    expect(isExpiredRequest({ requestedAt: now - 31 * DAY }, now)).toBe(true);
  });

  it('deletes expired requests and stale index entries, keeping recent ones', async () => {
    const count = await expireRequests('me', ['e1', 'deleted-event']);
    expect(written).toEqual({
      'accessRequests/e1/old@x,com': null,
      'requestsByOwner/me/e1/old@x,com': null,
      'requestsByOwner/me/e1/gone@x,com': null,
      'requestsByOwner/me/deleted-event/a@x,com': null,
    });
    expect(count).toBe(4);
  });

  it('treats a request without a date as expired, and an event with nothing as clean', async () => {
    Object.assign(tree, {
      accessRequests: { e2: { 'nodate@x,com': { email: 'nodate@x.com' } } },
      requestsByOwner: { me: {} },
    });
    expect(await expireRequests('me', ['e2', 'empty'])).toBe(2);
    expect(written).toEqual({
      'accessRequests/e2/nodate@x,com': null,
      'requestsByOwner/me/e2/nodate@x,com': null,
    });
  });

  it('writes nothing when everything is current', async () => {
    expect(await expireRequests('me', [])).toBe(0);
    expect(written).toBeNull();
  });
});
