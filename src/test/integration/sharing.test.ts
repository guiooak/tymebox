import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { makeGoal, makeMember } from '../fixtures';
import {
  clearDatabase,
  createEventAs,
  DENIED,
  peek,
  signInAs,
  startEnvironment,
  stopEnvironment,
} from './harness';
import {
  patchGoal,
  patchMeeting,
  read,
  setMemberRole,
  setVisibility,
  shareWith,
  unshare,
} from './repository';

beforeAll(startEnvironment);
afterAll(stopEnvironment);
beforeEach(clearDatabase);

const BRUNO = 'Bruno.Costa@example.com';
const BRUNO_KEY = 'bruno,costa@example,com';

describe('sharing an event', () => {
  it('lets a viewer read but not change it, until made a contributor', async () => {
    const ana = await signInAs('ana@example.com');
    const event = await createEventAs(ana);
    await shareWith(event.id, ` ${BRUNO} `, 'viewer');
    expect(await peek(`meetingAccess/${event.id}/members/${BRUNO_KEY}`)).toMatchObject({
      email: BRUNO,
      role: 'viewer',
    });
    expect(await peek(`sharedWith/${BRUNO_KEY}/${event.id}`)).toMatchObject({
      role: 'viewer',
    });

    await signInAs(BRUNO);
    expect(await read(`meetings/${event.id}/name`)).toBe(event.name);
    expect(await read(`sharedWith/${BRUNO_KEY}`)).toHaveProperty(event.id);
    await expect(patchMeeting(event.id, { name: 'Nope' })).rejects.toThrow(DENIED);

    await signInAs('ana@example.com');
    await setMemberRole(
      event.id,
      makeMember({ key: BRUNO_KEY, email: BRUNO }),
      'contributor',
    );

    await signInAs(BRUNO);
    await patchGoal(event.id, event.goals[0].id, {
      finishedAt: '2026-01-01T10:05:00.000Z',
    });
    await patchMeeting(event.id, { description: 'Edited by Bruno' });
    expect(await peek(`meetings/${event.id}/description`)).toBe('Edited by Bruno');
  });

  it('keeps sharing and the link settings to the owner', async () => {
    const ana = await signInAs('ana@example.com');
    const event = await createEventAs(ana);
    await shareWith(event.id, BRUNO, 'contributor');

    await signInAs(BRUNO);
    await expect(setVisibility(event.id, 'public', 'contributor')).rejects.toThrow(
      DENIED,
    );
    await expect(shareWith(event.id, 'friend@example.com', 'viewer')).rejects.toThrow(
      DENIED,
    );
    await expect(read(`meetingAccess/${event.id}/members`)).rejects.toThrow(DENIED);
  });

  it('takes access away when unshared, and lets a member leave', async () => {
    const ana = await signInAs('ana@example.com');
    const event = await createEventAs(ana);
    await shareWith(event.id, BRUNO, 'viewer');
    await shareWith(event.id, 'carla@example.com', 'viewer');
    await unshare(event.id, BRUNO_KEY);

    await signInAs(BRUNO);
    await expect(read(`meetings/${event.id}`)).rejects.toThrow(DENIED);
    expect(await read(`sharedWith/${BRUNO_KEY}`)).toBeNull();

    await signInAs('carla@example.com');
    await unshare(event.id, 'carla@example,com');
    expect(await peek(`meetingAccess/${event.id}/members`)).toBeNull();
  });

  it('opens a public link to anyone signed in, editable only when it says so', async () => {
    const ana = await signInAs('ana@example.com');
    const event = await createEventAs(ana);
    await setVisibility(event.id, 'public', 'viewer');

    await signInAs('dora@example.com');
    expect(await read(`meetings/${event.id}/name`)).toBe(event.name);
    expect(await read(`meetingAccess/${event.id}/owner`)).toBe(ana.uid);
    await expect(
      patchGoal(event.id, event.goals[0].id, { decisions: 'x' }),
    ).rejects.toThrow(DENIED);

    await signInAs('ana@example.com');
    await setVisibility(event.id, 'public', 'contributor');
    await signInAs('dora@example.com');
    await patchGoal(event.id, event.goals[0].id, { decisions: 'Public notes' });
    expect(await peek(`meetings/${event.id}/goals/${event.goals[0].id}/decisions`)).toBe(
      'Public notes',
    );
  });

  it('refuses values the rules don’t allow, even from the owner', async () => {
    const ana = await signInAs('ana@example.com');
    const event = await createEventAs(ana);
    await expect(
      patchGoal(event.id, event.goals[0].id, { weight: 1000 }),
    ).rejects.toThrow(DENIED);
    await expect(patchMeeting(event.id, { status: 'archived' as never })).rejects.toThrow(
      DENIED,
    );
    expect(makeGoal().weight).toBe(1);
  });
});
