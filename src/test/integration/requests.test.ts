import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  clearDatabase,
  createEventAs,
  DENIED,
  peek,
  plant,
  signInAs,
  type Person,
} from './harness';
import { startEnvironment, stopEnvironment } from './harness';
import {
  approveRequest,
  cancelAccessRequest,
  denyRequest,
  expireRequests,
  read,
  REQUEST_TTL_MS,
  requestAccess,
} from './repository';
import type { AccessRequest } from '../../features/meeting/domain/access';

beforeAll(startEnvironment);
afterAll(stopEnvironment);
beforeEach(clearDatabase);

const CARLA = 'carla.dias@example.com';
const CARLA_KEY = 'carla,dias@example,com';

async function carlaAsks(owner: Person, id: string) {
  const carla = await signInAs(CARLA);
  await requestAccess(
    id,
    owner.uid,
    carla.uid,
    { email: CARLA, name: 'Carla', photoURL: 'https://evil.example/p.png' },
    '  Can I join?  ',
  );
  return carla;
}

const request = (over: Partial<AccessRequest> = {}): AccessRequest => ({
  key: CARLA_KEY,
  email: CARLA,
  name: 'Carla',
  photoURL: '',
  message: '',
  requestedAt: Date.now(),
  ...over,
});

describe('access requests', () => {
  it('files a request the owner can see, indexed for both of them', async () => {
    const ana = await signInAs('ana@example.com');
    const event = await createEventAs(ana);
    const carla = await carlaAsks(ana, event.id);

    expect(await read(`accessRequests/${event.id}/${CARLA_KEY}`)).toMatchObject({
      email: CARLA,
      message: 'Can I join?',
      // Only Google profile photos are kept.
      photoURL: '',
    });
    expect(await read(`users/${carla.uid}/requested/${event.id}`)).toBe(true);
    await expect(read(`accessRequests/${event.id}`)).rejects.toThrow(DENIED);

    await signInAs('ana@example.com');
    expect(await read(`accessRequests/${event.id}`)).toHaveProperty(CARLA_KEY);
    expect(await read(`requestsByOwner/${ana.uid}/${event.id}`)).toEqual({
      [CARLA_KEY]: true,
    });
  });

  it('makes the requester a member once approved', async () => {
    const ana = await signInAs('ana@example.com');
    const event = await createEventAs(ana);
    await carlaAsks(ana, event.id);

    await signInAs('ana@example.com');
    await approveRequest(event.id, ana.uid, request(), 'contributor');
    expect(await peek(`accessRequests/${event.id}`)).toBeNull();
    expect(await peek(`requestsByOwner/${ana.uid}`)).toBeNull();

    await signInAs(CARLA);
    expect(await read(`meetings/${event.id}/name`)).toBe(event.name);
    expect(await read(`sharedWith/${CARLA_KEY}/${event.id}/role`)).toBe('contributor');
  });

  it('leaves the requester out when denied, and lets them withdraw', async () => {
    const ana = await signInAs('ana@example.com');
    const event = await createEventAs(ana);
    await carlaAsks(ana, event.id);
    await signInAs('ana@example.com');
    await denyRequest(event.id, ana.uid, request());
    expect(await peek(`accessRequests/${event.id}`)).toBeNull();

    const carla = await carlaAsks(ana, event.id);
    await cancelAccessRequest(event.id, ana.uid, carla.uid, CARLA);
    expect(await peek(`accessRequests/${event.id}`)).toBeNull();
    expect(await peek(`requestsByOwner/${ana.uid}`)).toBeNull();
    expect(await peek(`users/${carla.uid}/requested`)).toBeNull();
    await expect(read(`meetings/${event.id}`)).rejects.toThrow(DENIED);
  });

  it('won’t let a requester approve themselves or ask in someone else’s name', async () => {
    const ana = await signInAs('ana@example.com');
    const event = await createEventAs(ana);
    const carla = await carlaAsks(ana, event.id);
    await expect(approveRequest(event.id, ana.uid, request(), 'viewer')).rejects.toThrow(
      DENIED,
    );
    await expect(
      requestAccess(
        event.id,
        ana.uid,
        carla.uid,
        { email: 'bruno@example.com', name: 'Bruno', photoURL: '' },
        '',
      ),
    ).rejects.toThrow(DENIED);
  });

  it('won’t take a request from someone already in', async () => {
    const ana = await signInAs('ana@example.com');
    const event = await createEventAs(ana);
    await expect(
      requestAccess(
        event.id,
        ana.uid,
        ana.uid,
        { email: ana.email, name: 'Ana', photoURL: '' },
        '',
      ),
    ).rejects.toThrow(DENIED);
  });

  it('expires requests over 30 days old and index entries left behind', async () => {
    const ana = await signInAs('ana@example.com');
    const event = await createEventAs(ana);
    const gone = await createEventAs(ana);
    const old = Date.now() - REQUEST_TTL_MS - 60_000;
    await plant(`accessRequests/${event.id}`, {
      [CARLA_KEY]: { email: CARLA, requestedAt: old },
      'bruno@example,com': { email: 'bruno@example.com', requestedAt: Date.now() },
    });
    await plant(`requestsByOwner/${ana.uid}`, {
      [event.id]: {
        [CARLA_KEY]: true,
        'bruno@example,com': true,
        'left@example,com': true,
      },
      [gone.id]: { 'x@example,com': true },
    });
    await plant(`meetings/${gone.id}`, null);

    expect(await expireRequests(ana.uid, [event.id, gone.id])).toBe(4);
    expect(await peek(`accessRequests/${event.id}`)).toEqual({
      'bruno@example,com': expect.objectContaining({ email: 'bruno@example.com' }),
    });
    expect(await peek(`requestsByOwner/${ana.uid}`)).toEqual({
      [event.id]: { 'bruno@example,com': true },
    });
    expect(await expireRequests(ana.uid, [event.id])).toBe(0);
  });
});
