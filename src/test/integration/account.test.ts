import { getAuth } from 'firebase/auth';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { firebaseApp } from '../../common/services/database';
import { deleteAccount, exportAccount } from '../../features/account/accountRepository';
import {
  clearDatabase,
  createEventAs,
  DENIED,
  peek,
  plant,
  signInAs,
  startEnvironment,
  stopEnvironment,
  type Person,
} from './harness';
import {
  forgetVisit,
  migrateLegacyMeetings,
  read,
  recordVisit,
  requestAccess,
  setAutomaticBehavior,
  setCurrentMeetingId,
  setUserLocale,
  setVisibility,
  shareWith,
} from './repository';

beforeAll(startEnvironment);
afterAll(stopEnvironment);
beforeEach(clearDatabase);

const user = (person: Person) => ({
  uid: person.uid,
  email: person.email,
  displayName: person.name,
  photoURL: null,
});

describe('a user’s own data', () => {
  it('keeps settings, the current event and visits, for that user only', async () => {
    const ana = await signInAs('ana@example.com');
    await setCurrentMeetingId(ana.uid, 'e1');
    await setUserLocale(ana.uid, 'pt-BR');
    await setAutomaticBehavior(ana.uid, true);
    await recordVisit(ana.uid, 'e2');
    await recordVisit(ana.uid, 'e3');
    await forgetVisit(ana.uid, 'e3');
    expect(await read(`users/${ana.uid}`)).toMatchObject({
      currentMeetingId: 'e1',
      settings: { locale: 'pt-BR', decisionsAutomaticBehavior: true },
      visited: { e2: expect.any(Number) },
    });

    await signInAs('eve@example.com');
    await expect(read(`users/${ana.uid}`)).rejects.toThrow(DENIED);
    await expect(setUserLocale(ana.uid, 'en-US')).rejects.toThrow(DENIED);
  });

  it('moves events from before sharing to their own place, once', async () => {
    const ana = await signInAs('ana@example.com');
    const legacy = {
      old1: { name: 'Old planning', goals: [{ id: 'g1', name: 'Kick-off' }] },
      taken: { name: 'Clashes' },
    };
    await plant(`users/${ana.uid}/meetings`, legacy);
    await plant('meetings/taken', { id: 'taken', owner: 'someone-else', name: 'Theirs' });
    const warn = console.warn;
    console.warn = () => {};
    try {
      await migrateLegacyMeetings(ana.uid, 'Ana', legacy as never);
    } finally {
      console.warn = warn;
    }
    expect(await peek('meetings/old1')).toMatchObject({
      owner: ana.uid,
      name: 'Old planning',
    });
    expect(await peek('meetingAccess/old1')).toMatchObject({
      owner: ana.uid,
      visibility: 'private',
    });
    expect(await peek(`users/${ana.uid}/meetings`)).toEqual({
      taken: { name: 'Clashes' },
    });
    expect(await peek('meetings/taken/owner')).toBe('someone-else');
  });
});

describe('the account', () => {
  it('exports everything that is yours and nothing of anyone else’s', async () => {
    const bruno = await signInAs('bruno@example.com');
    const theirs = await createEventAs(bruno, { name: 'Bruno’s event' });
    const secret = await createEventAs(bruno, { name: 'Bruno’s secret' });
    await shareWith(theirs.id, 'ana@example.com', 'viewer');

    const ana = await signInAs('ana@example.com');
    const mine = await createEventAs(ana, { name: 'Ana’s event' });
    await shareWith(mine.id, 'carla@example.com', 'contributor');
    await setUserLocale(ana.uid, 'pt-BR');
    await requestAccess(
      secret.id,
      bruno.uid,
      ana.uid,
      { email: ana.email, name: 'Ana', photoURL: '' },
      'Hi',
    );

    const data = await exportAccount(user(ana));
    expect(data.events.map((entry) => entry.event.name)).toEqual(['Ana’s event']);
    expect(data.events[0].access.members).toHaveProperty('carla@example,com');
    expect(data.sharedWithMe).toHaveProperty(theirs.id);
    expect(data.requestsFiled).toEqual([
      { eventId: secret.id, request: expect.objectContaining({ message: 'Hi' }) },
    ]);
    expect(data.profile).toMatchObject({ settings: { locale: 'pt-BR' } });
    expect(JSON.stringify(data)).not.toContain('Bruno’s secret');
  });

  it('deletes every trace of you, and only yours', async () => {
    const bruno = await signInAs('bruno@example.com');
    const theirs = await createEventAs(bruno, { name: 'Bruno’s event' });
    const asked = await createEventAs(bruno, { name: 'Asked' });
    await shareWith(theirs.id, 'ana.lima@example.com', 'viewer');

    const ana = await signInAs('ana.lima@example.com');
    const mine = await createEventAs(ana);
    await shareWith(mine.id, 'carla@example.com', 'viewer');
    await setVisibility(mine.id, 'public', 'viewer');
    await setUserLocale(ana.uid, 'en-US');
    await requestAccess(
      asked.id,
      bruno.uid,
      ana.uid,
      { email: ana.email, name: 'Ana', photoURL: '' },
      '',
    );

    let released = false;
    await deleteAccount(user(ana), () => (released = true));
    expect(released).toBe(true);
    expect(getAuth(firebaseApp).currentUser).toBeNull();

    const everything = JSON.stringify(await peek());
    expect(everything).not.toContain(ana.uid);
    expect(everything).not.toContain('ana,lima@example,com');
    expect(everything).not.toContain('ana.lima@example.com');
    expect(everything).not.toContain(mine.id);
    expect(await peek(`meetings/${theirs.id}/name`)).toBe('Bruno’s event');
    expect(await peek(`meetings/${asked.id}/name`)).toBe('Asked');
  });
});
