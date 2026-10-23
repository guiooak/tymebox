import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import rules from '../../../database.rules.json?raw';

/*
 * Security rules for shared events, run against the Realtime Database emulator
 * (`yarn test:rules`). The UI hides what a role can't do; these prove the
 * database refuses it too.
 */

const OWNER = { uid: 'owner-uid', email: 'owner@example.com' };
const CONTRIB = { uid: 'contrib-uid', email: 'Con.Tributor@example.com' };
const VIEWER = { uid: 'viewer-uid', email: 'viewer@example.com' };
const STRANGER = { uid: 'stranger-uid', email: 'stranger@example.com' };

const key = (email: string) => email.toLowerCase().replace(/\./g, ',');
const ID = 'event1';

let env: RulesTestEnvironment;

const db = (user: { uid: string; email: string } | null) =>
  user
    ? env
        .authenticatedContext(user.uid, { email: user.email, email_verified: true })
        .database()
    : env.unauthenticatedContext().database();

const event = {
  id: ID,
  owner: OWNER.uid,
  ownerName: 'Olivia',
  name: 'Planning',
  description: '',
  expectedStartTime: '',
  expectedEndTime: '',
  realStartTime: '',
  realEndTime: '',
  status: 'draft',
  createdAt: '2026-10-16T10:00:00Z',
  updatedAt: '2026-10-16T10:00:00Z',
  goals: {
    g1: {
      id: 'g1',
      name: 'Kick-off',
      weight: 1,
      finishedAt: '',
      decisions: '',
      order: 0,
    },
  },
};

async function seed(visibility: 'private' | 'public' = 'private', publicRole = 'viewer') {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx
      .database()
      .ref()
      .set({
        meetings: { [ID]: event },
        meetingAccess: {
          [ID]: {
            owner: OWNER.uid,
            visibility,
            publicRole,
            members: {
              [key(CONTRIB.email)]: {
                email: CONTRIB.email,
                role: 'contributor',
                addedAt: 1,
              },
              [key(VIEWER.email)]: { email: VIEWER.email, role: 'viewer', addedAt: 1 },
            },
          },
        },
      });
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tymebox',
    database: { rules },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearDatabase();
});

describe('reading an event', () => {
  it('lets the owner and members read a private event, and nobody else', async () => {
    await seed();
    await assertSucceeds(db(OWNER).ref(`meetings/${ID}`).once('value'));
    await assertSucceeds(db(CONTRIB).ref(`meetings/${ID}`).once('value'));
    await assertSucceeds(db(VIEWER).ref(`meetings/${ID}`).once('value'));
    await assertFails(db(STRANGER).ref(`meetings/${ID}`).once('value'));
    await assertFails(db(null).ref(`meetings/${ID}`).once('value'));
  });

  it('lets anyone signed in read a public event, but not signed out', async () => {
    await seed('public');
    await assertSucceeds(db(STRANGER).ref(`meetings/${ID}`).once('value'));
    await assertFails(db(null).ref(`meetings/${ID}`).once('value'));
  });

  it('lists only your own events, and only through the owner query', async () => {
    await seed();
    await assertSucceeds(
      db(OWNER).ref('meetings').orderByChild('owner').equalTo(OWNER.uid).once('value'),
    );
    await assertFails(
      db(STRANGER).ref('meetings').orderByChild('owner').equalTo(OWNER.uid).once('value'),
    );
    await assertFails(db(OWNER).ref('meetings').once('value'));
  });
});

describe('editing an event', () => {
  it('lets the owner and contributors edit, not viewers or strangers', async () => {
    await seed();
    await assertSucceeds(db(OWNER).ref(`meetings/${ID}/name`).set('Renamed'));
    await assertSucceeds(
      db(CONTRIB).ref(`meetings/${ID}/goals/g1/finishedAt`).set('2026-10-16T10:05:00Z'),
    );
    await assertSucceeds(
      db(CONTRIB).ref(`meetings/${ID}`).update({ status: 'active', updatedAt: 'x' }),
    );
    await assertFails(db(VIEWER).ref(`meetings/${ID}/name`).set('Nope'));
    await assertFails(db(STRANGER).ref(`meetings/${ID}/goals/g1/finishedAt`).set('x'));
  });

  it('lets a public contributor edit, and a public viewer not', async () => {
    await seed('public', 'contributor');
    await assertSucceeds(db(STRANGER).ref(`meetings/${ID}/name`).set('Edited via link'));
    await seed('public', 'viewer');
    await assertFails(db(STRANGER).ref(`meetings/${ID}/name`).set('Nope'));
  });

  it('never lets anyone change the owner, nor a contributor delete the event', async () => {
    await seed();
    await assertFails(db(CONTRIB).ref(`meetings/${ID}/owner`).set(CONTRIB.uid));
    await assertFails(db(OWNER).ref(`meetings/${ID}/owner`).set(CONTRIB.uid));
    await assertFails(db(CONTRIB).ref(`meetings/${ID}`).remove());
    await assertSucceeds(db(OWNER).ref(`meetings/${ID}`).remove());
  });

  it('validates stored fields', async () => {
    await seed();
    await assertFails(db(OWNER).ref(`meetings/${ID}/status`).set('exploded'));
    await assertFails(
      db(OWNER).ref(`meetings/${ID}/goals/g2`).set({ id: 'g2', name: 'X', bogus: 1 }),
    );
    await assertFails(db(OWNER).ref(`meetings/${ID}/sneaky`).set('x'));
  });

  it('lets you create an event only as its owner, with its access settings', async () => {
    const id = 'event2';
    await assertSucceeds(
      db(STRANGER)
        .ref()
        .update({
          [`meetings/${id}`]: { ...event, id, owner: STRANGER.uid },
          [`meetingAccess/${id}`]: {
            owner: STRANGER.uid,
            visibility: 'private',
            publicRole: 'viewer',
          },
        }),
    );
    await assertFails(
      db(STRANGER)
        .ref(`meetings/event3`)
        .set({ ...event, id: 'event3', owner: OWNER.uid }),
    );
  });
});

describe('access settings', () => {
  it('lets only the owner share, change roles and change visibility', async () => {
    await seed();
    const member = `meetingAccess/${ID}/members/${key(STRANGER.email)}`;
    const entry = { email: STRANGER.email, role: 'viewer', addedAt: 2 };
    await assertSucceeds(db(OWNER).ref(member).set(entry));
    await assertFails(
      db(CONTRIB)
        .ref(`meetingAccess/${ID}/members/${key(CONTRIB.email)}/role`)
        .set('viewer'),
    );
    await assertFails(
      db(VIEWER)
        .ref(`meetingAccess/${ID}/members/${key(VIEWER.email)}/role`)
        .set('contributor'),
    );
    await assertSucceeds(db(OWNER).ref(`meetingAccess/${ID}/visibility`).set('public'));
    await assertFails(db(CONTRIB).ref(`meetingAccess/${ID}/visibility`).set('private'));
  });

  it('shows the member list only to the owner; each member sees their own entry', async () => {
    await seed();
    await assertSucceeds(db(OWNER).ref(`meetingAccess/${ID}/members`).once('value'));
    await assertFails(db(VIEWER).ref(`meetingAccess/${ID}/members`).once('value'));
    await assertSucceeds(
      db(VIEWER)
        .ref(`meetingAccess/${ID}/members/${key(VIEWER.email)}`)
        .once('value'),
    );
    await assertFails(
      db(VIEWER)
        .ref(`meetingAccess/${ID}/members/${key(CONTRIB.email)}`)
        .once('value'),
    );
    await assertSucceeds(
      db(STRANGER).ref(`meetingAccess/${ID}/visibility`).once('value'),
    );
  });

  it('builds the email key the same way the app does, dots and case included', async () => {
    await seed();
    // CONTRIB's email has a dot in the local part and capitals.
    await assertSucceeds(db(CONTRIB).ref(`meetings/${ID}/description`).set('ok'));
  });
});

describe('shared-with-me index', () => {
  it('lets the owner add entries and the person read or leave them', async () => {
    await seed();
    const entry = `sharedWith/${key(VIEWER.email)}/${ID}`;
    await assertSucceeds(db(OWNER).ref(entry).set({ addedAt: 1, role: 'viewer' }));
    await assertFails(
      db(STRANGER)
        .ref(`sharedWith/${key(STRANGER.email)}/${ID}`)
        .set({ addedAt: 1 }),
    );
    await assertSucceeds(
      db(VIEWER)
        .ref(`sharedWith/${key(VIEWER.email)}`)
        .once('value'),
    );
    await assertFails(
      db(STRANGER)
        .ref(`sharedWith/${key(VIEWER.email)}`)
        .once('value'),
    );
    await assertSucceeds(db(VIEWER).ref(entry).remove());
  });
});

describe('access requests', () => {
  const request = (user: { email: string }) => ({
    email: user.email,
    name: 'Someone',
    photoURL: '',
    message: 'Can I join?',
    requestedAt: 5,
  });

  it('lets someone without access request it for themselves only', async () => {
    await seed();
    const mine = `accessRequests/${ID}/${key(STRANGER.email)}`;
    await assertSucceeds(db(STRANGER).ref(mine).set(request(STRANGER)));
    await assertSucceeds(db(STRANGER).ref(mine).once('value'));
    await assertFails(
      db(STRANGER)
        .ref(`accessRequests/${ID}/${key(VIEWER.email)}`)
        .set(request(VIEWER)),
    );
    await assertFails(
      db(STRANGER)
        .ref(mine)
        .set({ ...request(STRANGER), email: VIEWER.email }),
    );
    await assertFails(db(STRANGER).ref(`accessRequests/${ID}`).once('value'));
    await assertSucceeds(db(STRANGER).ref(mine).remove());
  });

  it('refuses requests from members, the owner, or for a missing event', async () => {
    await seed();
    await assertFails(
      db(VIEWER)
        .ref(`accessRequests/${ID}/${key(VIEWER.email)}`)
        .set(request(VIEWER)),
    );
    await assertFails(
      db(OWNER)
        .ref(`accessRequests/${ID}/${key(OWNER.email)}`)
        .set(request(OWNER)),
    );
    await assertFails(
      db(STRANGER)
        .ref(`accessRequests/nope/${key(STRANGER.email)}`)
        .set(request(STRANGER)),
    );
  });

  it('lets the owner read, approve and deny requests', async () => {
    await seed();
    const k = key(STRANGER.email);
    await assertSucceeds(
      db(STRANGER)
        .ref()
        .update({
          [`accessRequests/${ID}/${k}`]: request(STRANGER),
          [`requestsByOwner/${OWNER.uid}/${ID}/${k}`]: true,
        }),
    );
    await assertSucceeds(db(OWNER).ref(`accessRequests/${ID}`).once('value'));
    await assertSucceeds(db(OWNER).ref(`requestsByOwner/${OWNER.uid}`).once('value'));
    await assertSucceeds(
      db(OWNER)
        .ref()
        .update({
          [`meetingAccess/${ID}/members/${k}`]: {
            email: STRANGER.email,
            role: 'viewer',
            addedAt: 9,
          },
          [`sharedWith/${k}/${ID}`]: { addedAt: 9, role: 'viewer' },
          [`accessRequests/${ID}/${k}`]: null,
          [`requestsByOwner/${OWNER.uid}/${ID}/${k}`]: null,
        }),
    );
    await assertSucceeds(db(STRANGER).ref(`meetings/${ID}`).once('value'));
  });

  it('only indexes a request under the event’s real owner', async () => {
    await seed();
    const k = key(STRANGER.email);
    await assertFails(
      db(STRANGER).ref(`requestsByOwner/${VIEWER.uid}/${ID}/${k}`).set(true),
    );
    await assertFails(db(STRANGER).ref(`requestsByOwner/${OWNER.uid}`).once('value'));
  });
});

describe('legacy per-user events', () => {
  it('can be read and removed by their owner but no longer written', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .database()
        .ref(`users/${OWNER.uid}/meetings/old`)
        .set({ id: 'old', name: 'Old' });
    });
    await assertSucceeds(db(OWNER).ref(`users/${OWNER.uid}/meetings`).once('value'));
    await assertFails(db(OWNER).ref(`users/${OWNER.uid}/meetings/old/name`).set('New'));
    await assertSucceeds(db(OWNER).ref(`users/${OWNER.uid}/meetings/old`).remove());
    await assertFails(db(STRANGER).ref(`users/${OWNER.uid}/meetings`).once('value'));
  });
});

describe('unverified email addresses', () => {
  // The same people, but with an address the sign-in provider didn't verify:
  // what's tied to an email must not open for them.
  const unverified = (user: { uid: string; email: string }) =>
    env
      .authenticatedContext(user.uid, { email: user.email, email_verified: false })
      .database();

  it('get none of the access shared with that email', async () => {
    await seed();
    await assertFails(unverified(VIEWER).ref(`meetings/${ID}`).once('value'));
    await assertFails(unverified(CONTRIB).ref(`meetings/${ID}/name`).set('Hijacked'));
    await assertFails(
      unverified(VIEWER)
        .ref(`meetingAccess/${ID}/members/${key(VIEWER.email)}`)
        .once('value'),
    );
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .database()
        .ref(`sharedWith/${key(VIEWER.email)}/${ID}`)
        .set({ addedAt: 1, role: 'viewer' });
    });
    await assertFails(
      unverified(VIEWER)
        .ref(`sharedWith/${key(VIEWER.email)}`)
        .once('value'),
    );
    await assertFails(
      unverified(VIEWER)
        .ref(`sharedWith/${key(VIEWER.email)}/${ID}`)
        .remove(),
    );
  });

  it('can’t ask for access in that email’s name', async () => {
    await seed();
    await assertFails(
      unverified(STRANGER)
        .ref(`accessRequests/${ID}/${key(STRANGER.email)}`)
        .set({ email: STRANGER.email, name: 'S', photoURL: '', requestedAt: 1 }),
    );
    await assertFails(
      unverified(STRANGER)
        .ref(`requestsByOwner/${OWNER.uid}/${ID}/${key(STRANGER.email)}`)
        .set(true),
    );
  });

  it('still see public events and their own events', async () => {
    await seed('public');
    await assertSucceeds(unverified(STRANGER).ref(`meetings/${ID}`).once('value'));
    await assertSucceeds(unverified(OWNER).ref(`meetings/${ID}/name`).set('Mine'));
  });
});

describe('access request pictures', () => {
  it('accept only Google profile pictures, or none', async () => {
    await seed();
    const mine = db(STRANGER).ref(`accessRequests/${ID}/${key(STRANGER.email)}`);
    const base = { email: STRANGER.email, name: 'S', requestedAt: 1 };
    await assertFails(
      mine.set({ ...base, photoURL: 'https://tracker.example/pixel.gif' }),
    );
    await assertFails(
      mine.set({ ...base, photoURL: 'https://lh3.googleusercontent.com.evil.example/a' }),
    );
    await assertSucceeds(
      mine.set({ ...base, photoURL: 'https://lh3.googleusercontent.com/a/abc=s96-c' }),
    );
    await assertSucceeds(mine.set({ ...base, photoURL: '' }));
  });
});

describe('your own user node', () => {
  it('holds only known fields, and only you can touch it', async () => {
    const me = db(OWNER).ref(`users/${OWNER.uid}`);
    await assertSucceeds(me.child('currentMeetingId').set(ID));
    await assertSucceeds(me.child('settings/decisionsAutomaticBehavior').set(false));
    await assertSucceeds(me.child('visited/abc').set(123));
    await assertFails(me.child('anything').set('x'.repeat(100)));
    await assertFails(me.child('settings/other').set(true));
    await assertFails(me.child('visited/abc').set('soon'));
    await assertFails(me.child('currentMeetingId').set('x'.repeat(200)));
    await assertSucceeds(me.child('settings/locale').set('pt-BR'));
    await assertSucceeds(me.child('settings/locale').set('en-US'));
    await assertFails(me.child('settings/locale').set('fr-FR'));
    await assertFails(db(STRANGER).ref(`users/${OWNER.uid}/currentMeetingId`).set(ID));
  });

  it('keeps an index of the events you asked to join', async () => {
    const requested = db(STRANGER).ref(`users/${STRANGER.uid}/requested/${ID}`);
    await assertSucceeds(requested.set(true));
    await assertFails(requested.set('yes'));
    await assertSucceeds(requested.remove());
    await assertFails(db(OWNER).ref(`users/${STRANGER.uid}/requested/${ID}`).set(true));
  });
});

describe('leaving an event', () => {
  it('lets a member remove their own entry, and only that', async () => {
    await seed();
    const members = `meetingAccess/${ID}/members`;
    await assertFails(
      db(VIEWER)
        .ref(`${members}/${key(CONTRIB.email)}`)
        .remove(),
    );
    // Removing yourself, yes; promoting yourself, no.
    await assertFails(
      db(VIEWER)
        .ref(`${members}/${key(VIEWER.email)}/role`)
        .set('contributor'),
    );
    await assertSucceeds(
      db(VIEWER)
        .ref(`${members}/${key(VIEWER.email)}`)
        .remove(),
    );
    await assertFails(db(VIEWER).ref(`meetings/${ID}`).once('value'));
    await assertFails(
      db(STRANGER)
        .ref(`${members}/${key(CONTRIB.email)}`)
        .remove(),
    );
  });
});

/*
 * Leaks: whatever a rule change opens by mistake should fail here, before the
 * rules ship. Each node is read and written as signed out, as a stranger and
 * as a viewer of the event.
 */
describe('nothing leaks to people without access', () => {
  async function seedEverything() {
    await seed();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const root = ctx.database().ref();
      await root.update({
        [`sharedWith/${key(VIEWER.email)}/${ID}`]: { addedAt: 1, role: 'viewer' },
        [`accessRequests/${ID}/${key('asker@example.com')}`]: {
          email: 'asker@example.com',
          name: 'Asker',
          photoURL: '',
          message: '',
          requestedAt: 1,
        },
        [`requestsByOwner/${OWNER.uid}/${ID}/${key('asker@example.com')}`]: true,
        [`users/${OWNER.uid}/currentMeetingId`]: ID,
      });
    });
  }

  it('never lets anyone read the root or a whole collection', async () => {
    await seedEverything();
    for (const user of [null, STRANGER, VIEWER, OWNER]) {
      for (const path of [
        '',
        'meetings',
        'meetingAccess',
        'sharedWith',
        'accessRequests',
        'requestsByOwner',
        'users',
      ]) {
        await assertFails(
          db(user)
            .ref(path || undefined)
            .once('value'),
        );
      }
    }
  });

  it('keeps each node to the people it belongs to', async () => {
    await seedEverything();
    const others = [null, STRANGER, VIEWER];
    for (const user of others) {
      await assertFails(db(user).ref(`meetingAccess/${ID}/members`).once('value'));
      await assertFails(db(user).ref(`accessRequests/${ID}`).once('value'));
      await assertFails(db(user).ref(`requestsByOwner/${OWNER.uid}`).once('value'));
      await assertFails(db(user).ref(`users/${OWNER.uid}`).once('value'));
    }
    for (const user of [null, STRANGER]) {
      await assertFails(db(user).ref(`meetings/${ID}`).once('value'));
      await assertFails(
        db(user)
          .ref(`sharedWith/${key(VIEWER.email)}`)
          .once('value'),
      );
    }
  });

  it('refuses writes from people without access, everywhere', async () => {
    await seedEverything();
    for (const user of [null, STRANGER, VIEWER]) {
      const ref = (path: string) => db(user).ref(path);
      await assertFails(ref(`meetings/${ID}`).remove());
      await assertFails(ref(`meetings/${ID}/name`).set('Hijacked'));
      await assertFails(ref(`meetingAccess/${ID}`).remove());
      await assertFails(ref(`meetingAccess/${ID}/visibility`).set('public'));
      await assertFails(
        ref(`meetingAccess/${ID}/members/${key('evil@example.com')}`).set({
          email: 'evil@example.com',
          role: 'contributor',
          addedAt: 1,
        }),
      );
      await assertFails(
        ref(`sharedWith/${key(VIEWER.email)}/other`).set({ addedAt: 1, role: 'viewer' }),
      );
      await assertFails(ref(`accessRequests/${ID}/${key('asker@example.com')}`).remove());
      await assertFails(
        ref(`requestsByOwner/${OWNER.uid}/${ID}/${key('asker@example.com')}`).remove(),
      );
      await assertFails(ref(`users/${OWNER.uid}/currentMeetingId`).set('other'));
    }
  });
});
