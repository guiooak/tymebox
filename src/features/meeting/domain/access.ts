/**
 * Who may open an event and what they may do there.
 *
 * Access is keyed by email, not by account: the database rules compare the
 * signed-in user's (Google-verified) email with these keys, so an event can be
 * shared with someone who has never signed in, and no email → account lookup
 * (or server code) is needed.
 */

export type Role = 'owner' | 'contributor' | 'viewer';

/** A role someone else can be given; ownership never changes hands. */
export type GrantedRole = Exclude<Role, 'owner'>;

export type Visibility = 'private' | 'public';

/** The publicly readable part of an event's access settings. */
export type AccessSettings = {
  owner: string;
  visibility: Visibility;
  /** The role anyone signed in gets through the link when the event is public. */
  publicRole: GrantedRole;
};

export type Member = {
  key: string;
  email: string;
  role: GrantedRole;
  addedAt: number;
};

export type AccessRequest = {
  key: string;
  email: string;
  name: string;
  photoURL: string;
  message: string;
  requestedAt: number;
};

export type Action = 'share' | 'delete' | 'run' | 'edit' | 'view';

export const ACCESS_LIMITS = {
  email: 254,
  requestMessage: 280,
  name: 200,
} as const;

/**
 * The database key for an email: lowercased, with `.` (not allowed in keys)
 * turned into `,`. The rules build the same key from `auth.token.email`.
 */
export function emailKey(email: string): string {
  return email.trim().toLowerCase().replace(/\./g, ',');
}

/** Shape check for an address to share with; also refuses characters keys can't hold. */
export function isValidShareEmail(email: string): boolean {
  const value = email.trim();
  return (
    value.length > 0 &&
    value.length <= ACCESS_LIMITS.email &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) &&
    !/[#$[\]/]/.test(value)
  );
}

/**
 * The viewer's role in an event, or null when they have none.
 * `member` is their own entry in the member list, if any.
 */
export function roleFor(
  access: AccessSettings | null,
  viewer: { uid: string } | null,
  member: Pick<Member, 'role'> | null,
): Role | null {
  if (!access || !viewer) {
    return null;
  }
  if (access.owner === viewer.uid) {
    return 'owner';
  }
  const granted: GrantedRole[] = [];
  if (member) {
    granted.push(member.role);
  }
  if (access.visibility === 'public') {
    granted.push(access.publicRole);
  }
  if (granted.includes('contributor')) {
    return 'contributor';
  }
  return granted.length > 0 ? 'viewer' : null;
}

const ALLOWED: Record<Role, Action[]> = {
  owner: ['share', 'delete', 'run', 'edit', 'view'],
  contributor: ['run', 'edit', 'view'],
  viewer: ['view'],
};

export function can(role: Role | null, action: Action): boolean {
  return !!role && ALLOWED[role].includes(action);
}

export const ROLE_LABELS: Record<GrantedRole, string> = {
  viewer: 'Viewer',
  contributor: 'Contributor',
};

const GOOGLE_PHOTOS = 'https://lh3.googleusercontent.com/';

/** The rules accept only Google profile pictures on an access request; anything else goes as none. */
export function requestPhoto(url: string): string {
  return url.startsWith(GOOGLE_PHOTOS) ? url : '';
}
