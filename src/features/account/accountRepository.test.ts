// An in-memory database: reads walk a plain object; writes are recorded.
const tree: Record<string, unknown> = {};
const calls: string[] = [];

function at(path: string): unknown {
  return path
    .split('/')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      tree,
    );
}

vi.mock('../../common/services/database', () => ({
  read: vi.fn(async (path: string) => at(path) ?? null),
  readWhere: vi.fn(async (path: string, field: string, value: string) => {
    const entries = Object.entries(
      (at(path) as Record<string, Record<string, unknown>>) ?? {},
    );
    const matches = entries.filter(([, child]) => child[field] === value);
    return matches.length ? Object.fromEntries(matches) : null;
  }),
  writeMany: vi.fn(async (changes: Record<string, unknown>) => {
    calls.push(...Object.keys(changes).map((path) => `remove ${path}`));
  }),
  removeAt: vi.fn(async (path: string) => {
    calls.push(`remove ${path}`);
  }),
}));

vi.mock('../../common/services/auth', () => ({
  reauthenticate: vi.fn(async () => {
    calls.push('reauthenticate');
  }),
  deleteCurrentUser: vi.fn(async () => {
    calls.push('deleteUser');
  }),
}));

vi.mock('../meeting/domain/meetingRepository', () => ({
  deleteMeetingEverywhere: vi.fn(async (meeting: { id: string }) => {
    calls.push(`delete event ${meeting.id}`);
  }),
}));

const { reauthenticate } = await import('../../common/services/auth');
const { deleteAccount, exportAccount, summarizeAccount } =
  await import('./accountRepository');

const ME = {
  uid: 'me',
  email: 'Me.Myself@example.com',
  displayName: 'Me',
  photoURL: null,
};
const MY_KEY = 'me,myself@example,com';

beforeEach(() => {
  calls.length = 0;
  for (const name of Object.keys(tree)) {
    delete tree[name];
  }
  Object.assign(tree, {
    meetings: {
      mine1: { id: 'mine1', owner: 'me', name: 'Planning' },
      mine2: { id: 'mine2', owner: 'me', name: 'Retro' },
      theirs: { id: 'theirs', owner: 'them', name: 'Their event' },
    },
    meetingAccess: {
      mine1: {
        owner: 'me',
        visibility: 'private',
        members: { 'friend@example,com': { role: 'viewer' } },
      },
      mine2: { owner: 'me', visibility: 'private' },
      theirs: { owner: 'them', visibility: 'private', members: { [MY_KEY]: {} } },
      asked: { owner: 'other-owner', visibility: 'private' },
    },
    sharedWith: { [MY_KEY]: { theirs: { role: 'viewer', addedAt: 1 } } },
    accessRequests: { asked: { [MY_KEY]: { email: ME.email, requestedAt: 5 } } },
    users: { me: { currentMeetingId: 'mine1', requested: { asked: true } } },
  });
  localStorage.setItem('tw-theme', 'dark');
  localStorage.setItem('unrelated', 'keep');
});

describe('summarizeAccount', () => {
  it('counts your events and the ones others can open', async () => {
    expect(await summarizeAccount('me')).toEqual({ events: 2, sharedEvents: 1 });
  });
});

describe('exportAccount', () => {
  it('gathers every place your data lives', async () => {
    const data = await exportAccount(ME);
    expect(data.account).toEqual({
      uid: 'me',
      name: 'Me',
      email: ME.email,
      photoURL: null,
    });
    expect(data.profile).toMatchObject({ currentMeetingId: 'mine1' });
    expect(data.events.map((entry) => entry.event.name).sort()).toEqual([
      'Planning',
      'Retro',
    ]);
    expect(
      data.events.find((entry) => entry.event.id === 'mine1')?.access.members,
    ).toEqual({
      'friend@example,com': { role: 'viewer' },
    });
    expect(data.sharedWithMe).toHaveProperty('theirs');
    expect(data.requestsFiled).toEqual([
      { eventId: 'asked', request: { email: ME.email, requestedAt: 5 } },
    ]);
    expect(data.browser).toEqual({ 'tw-theme': 'dark' });
  });
});

describe('exportAccount with nothing saved', () => {
  it('returns empty sections instead of missing ones', async () => {
    for (const name of Object.keys(tree)) {
      delete tree[name];
    }
    localStorage.clear();
    const data = await exportAccount(ME);
    expect(data).toMatchObject({
      profile: {},
      events: [],
      sharedWithMe: {},
      requestsFiled: [],
      browser: {},
    });
    expect(await summarizeAccount('me')).toEqual({ events: 0, sharedEvents: 0 });
  });

  it('leaves out requests that were since answered, and public events count as shared', async () => {
    tree.users = { me: { requested: { asked: true, answered: true } } };
    (tree.meetingAccess as Record<string, unknown>).mine2 = {
      owner: 'me',
      visibility: 'public',
    };
    const data = await exportAccount(ME);
    expect(data.requestsFiled.map((entry) => entry.eventId)).toEqual(['asked']);
    expect(await summarizeAccount('me')).toEqual({ events: 2, sharedEvents: 2 });
  });
});

describe('deleteAccount', () => {
  it('signs in again, erases everything, and deletes the sign-in last', async () => {
    await deleteAccount(ME, () => calls.push('release listeners'));
    expect(calls).toEqual([
      'reauthenticate',
      'release listeners',
      'delete event mine1',
      'delete event mine2',
      `remove meetingAccess/theirs/members/${MY_KEY}`,
      `remove sharedWith/${MY_KEY}/theirs`,
      `remove accessRequests/asked/${MY_KEY}`,
      `remove requestsByOwner/other-owner/asked/${MY_KEY}`,
      'remove users/me',
      'deleteUser',
    ]);
    expect(localStorage.getItem('tw-theme')).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep');
  });

  it('copes with an account that has nothing anywhere', async () => {
    for (const name of Object.keys(tree)) {
      delete tree[name];
    }
    // A request whose event is already gone: no owner to tidy up after.
    tree.users = { me: { requested: { gone: true } } };
    await deleteAccount(ME);
    expect(calls).toEqual([
      'reauthenticate',
      `remove accessRequests/gone/${MY_KEY}`,
      'remove users/me',
      'deleteUser',
    ]);
  });

  it('deletes a user who never filed a request', async () => {
    tree.users = {};
    await deleteAccount(ME);
    expect(calls).not.toContain(`remove accessRequests/asked/${MY_KEY}`);
    expect(calls.at(-1)).toBe('deleteUser');
  });

  it('still deletes when the browser storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    await deleteAccount(ME);
    expect(calls.at(-1)).toBe('deleteUser');
    vi.restoreAllMocks();
  });

  it('deletes nothing when the Google sign-in is closed', async () => {
    vi.mocked(reauthenticate).mockRejectedValueOnce(
      Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' }),
    );
    await expect(deleteAccount(ME)).rejects.toThrow('closed');
    expect(calls).toEqual([]);
  });
});
