import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  deleteGoal,
  deleteMeetingEverywhere,
  deleteSideTopic,
  newSideTopicKey,
  patchGoal,
  patchMeeting,
  putGoal,
  putSideTopic,
  read,
  requestAccess,
  resetProgress,
  setGoalOrder,
  setSideTopicValue,
  shareWith,
} from './repository';
import { makeGoal } from '../fixtures';
import {
  clearDatabase,
  createEventAs,
  DENIED,
  peek,
  signInAs,
  startEnvironment,
  stopEnvironment,
} from './harness';

beforeAll(startEnvironment);
afterAll(stopEnvironment);
beforeEach(clearDatabase);

describe('an event’s lifecycle', () => {
  it('lets the owner create and change everything on the board', async () => {
    const ana = await signInAs('ana.lima@example.com');
    const event = await createEventAs(ana);
    expect(await peek(`meetingAccess/${event.id}`)).toEqual({
      owner: ana.uid,
      visibility: 'private',
      publicRole: 'viewer',
    });

    await patchMeeting(event.id, { name: 'Renamed', status: 'active' });
    await putGoal(event.id, makeGoal({ id: 'g9', name: 'Added' }), 5);
    await patchGoal(event.id, 'g9', {
      decisions: 'Ship it',
      finishedAt: '2026-01-01T10:20:00.000Z',
    });
    await setGoalOrder(event.id, [makeGoal({ id: 'g9' }), ...event.goals]);
    await deleteGoal(event.id, event.goals[0].id);
    const key = newSideTopicKey(event.id);
    await putSideTopic(event.id, key, { id: key, value: 'Budget', goalName: 'Added' });
    await setSideTopicValue(event.id, key, 'Budget 2027');
    await resetProgress(event.id, [makeGoal({ id: 'g9' })], { realStartTime: '' });

    const stored = await peek<{
      goals: Record<string, Record<string, unknown>>;
      sideTopics: Record<string, { value: string }>;
    }>(`meetings/${event.id}`);
    expect(stored).toMatchObject({ name: 'Renamed', status: 'active' });
    expect(stored?.goals.g9).toMatchObject({
      order: 0,
      decisions: 'Ship it',
      finishedAt: '',
    });
    expect(stored?.goals[event.goals[0].id]).toBeUndefined();
    expect(stored?.sideTopics[key].value).toBe('Budget 2027');
    expect(await read(`meetings/${event.id}/name`)).toBe('Renamed');

    await deleteSideTopic(event.id, key);
    expect(await peek(`meetings/${event.id}/sideTopics`)).toBeNull();
  });

  it('refuses a stranger’s reads and writes', async () => {
    const ana = await signInAs('ana@example.com');
    const event = await createEventAs(ana);

    const eve = await signInAs('eve@example.com');
    await expect(read(`meetings/${event.id}`)).rejects.toThrow(DENIED);
    await expect(patchMeeting(event.id, { name: 'Mine now' })).rejects.toThrow(DENIED);
    await expect(putGoal(event.id, makeGoal({ id: 'x' }), 0)).rejects.toThrow(DENIED);
    await expect(
      putSideTopic(event.id, 'k', { id: 'k', value: 'spam', goalName: '' }),
    ).rejects.toThrow(DENIED);
    await expect(deleteMeetingEverywhere(event)).rejects.toThrow(DENIED);
    await expect(shareWith(event.id, eve.email, 'contributor')).rejects.toThrow(DENIED);
    expect(await peek(`meetings/${event.id}/name`)).toBe(event.name);
  });

  it('refuses an event created in someone else’s name', async () => {
    const ana = await signInAs('ana@example.com');
    await signInAs('eve@example.com');
    await expect(createEventAs(ana)).rejects.toThrow(DENIED);
  });

  it('deletes an event with its shares and requests, leaving nothing dangling', async () => {
    const ana = await signInAs('ana@example.com');
    const event = await createEventAs(ana);
    await shareWith(event.id, 'bruno@example.com', 'viewer');

    const carla = await signInAs('carla@example.com');
    await requestAccess(
      event.id,
      ana.uid,
      carla.uid,
      { email: carla.email, name: 'Carla', photoURL: '' },
      '',
    );

    await signInAs('ana@example.com');
    await deleteMeetingEverywhere(event);
    for (const path of [
      `meetings/${event.id}`,
      `meetingAccess/${event.id}`,
      `sharedWith/bruno@example,com/${event.id}`,
      `accessRequests/${event.id}`,
      `requestsByOwner/${ana.uid}/${event.id}`,
    ]) {
      expect(await peek(path)).toBeNull();
    }
    // Carla's own index of what she asked for is hers to clear (the owner
    // can't write to her node); it outlives the request by design.
    expect(await peek(`users/${carla.uid}/requested/${event.id}`)).toBe(true);
  });
});
