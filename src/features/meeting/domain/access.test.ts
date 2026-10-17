import { can, emailKey, isValidShareEmail, roleFor, type AccessSettings } from './access';

const access = (over: Partial<AccessSettings> = {}): AccessSettings => ({
  owner: 'owner-uid',
  visibility: 'private',
  publicRole: 'viewer',
  ...over,
});

describe('emailKey', () => {
  it('lowercases and replaces dots, like the rules do', () => {
    expect(emailKey('  Ana.Silva@Example.COM ')).toBe('ana,silva@example,com');
  });
});

describe('isValidShareEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidShareEmail('ana@example.com')).toBe(true);
    expect(isValidShareEmail('a.b+tag@sub.example.co')).toBe(true);
  });

  it('refuses malformed addresses and characters keys cannot hold', () => {
    expect(isValidShareEmail('')).toBe(false);
    expect(isValidShareEmail('ana')).toBe(false);
    expect(isValidShareEmail('ana@example')).toBe(false);
    expect(isValidShareEmail('a#b@example.com')).toBe(false);
    expect(isValidShareEmail('a/b@example.com')).toBe(false);
  });
});

describe('roleFor', () => {
  const viewer = { uid: 'someone' };

  it('makes the owner the owner whatever else is set', () => {
    expect(roleFor(access(), { uid: 'owner-uid' }, null)).toBe('owner');
  });

  it('gives members their role and strangers nothing on a private event', () => {
    expect(roleFor(access(), viewer, { role: 'viewer' })).toBe('viewer');
    expect(roleFor(access(), viewer, { role: 'contributor' })).toBe('contributor');
    expect(roleFor(access(), viewer, null)).toBeNull();
  });

  it('gives anyone signed in the public role on a public event', () => {
    expect(roleFor(access({ visibility: 'public' }), viewer, null)).toBe('viewer');
    expect(
      roleFor(access({ visibility: 'public', publicRole: 'contributor' }), viewer, null),
    ).toBe('contributor');
  });

  it('keeps the stronger of a member role and the public role', () => {
    const open = access({ visibility: 'public', publicRole: 'contributor' });
    expect(roleFor(open, viewer, { role: 'viewer' })).toBe('contributor');
    expect(
      roleFor(access({ visibility: 'public' }), viewer, { role: 'contributor' }),
    ).toBe('contributor');
  });

  it('is null without access settings or a signed-in viewer', () => {
    expect(roleFor(null, viewer, null)).toBeNull();
    expect(roleFor(access(), null, null)).toBeNull();
  });
});

describe('can', () => {
  it('lets only the owner share and delete', () => {
    expect(can('owner', 'share')).toBe(true);
    expect(can('contributor', 'share')).toBe(false);
    expect(can('contributor', 'delete')).toBe(false);
  });

  it('lets contributors run and edit, viewers only view', () => {
    expect(can('contributor', 'run')).toBe(true);
    expect(can('contributor', 'edit')).toBe(true);
    expect(can('viewer', 'edit')).toBe(false);
    expect(can('viewer', 'view')).toBe(true);
    expect(can(null, 'view')).toBe(false);
  });
});
