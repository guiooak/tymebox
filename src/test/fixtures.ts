import type { AuthUser } from '../common/services/auth';
import type {
  AccessRequest,
  AccessSettings,
  Member,
} from '../features/meeting/domain/access';
import type { Goal, Meeting, SideTopic } from '../features/meeting/domain/types';
import type { SharedEventSummary, Viewer } from '../features/meeting/store';

/*
 * Test data with sensible defaults: pass only what a test is about. Times are
 * fixed (1 January 2026, 10:00–11:00 UTC) so results never depend on the clock.
 */

export const T0 = '2026-01-01T10:00:00.000Z';
export const T_END = '2026-01-01T11:00:00.000Z';

export function makeGoal(over: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    name: 'Review last week',
    weight: 1,
    finishedAt: '',
    decisions: '',
    ...over,
  };
}

export function makeSideTopic(over: Partial<SideTopic> = {}): SideTopic {
  return { id: 't1', value: 'Budget for Q3', goalName: '', key: 'k1', ...over };
}

/** A draft owned by `u1`, with two open milestones. */
export function makeMeeting(over: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    owner: 'u1',
    ownerName: 'Ana',
    name: 'Weekly planning',
    description: '',
    expectedStartTime: T0,
    expectedEndTime: T_END,
    realStartTime: '',
    realEndTime: '',
    goals: [
      makeGoal({ id: 'g1', name: 'Review last week' }),
      makeGoal({ id: 'g2', name: 'Pick priorities' }),
    ],
    sideTopics: [],
    status: 'draft',
    createdAt: T0,
    updatedAt: T0,
    ...over,
  };
}

/** Running since T0, the first milestone done at 10:10. */
export function makeLiveMeeting(over: Partial<Meeting> = {}): Meeting {
  return makeMeeting({
    status: 'active',
    realStartTime: T0,
    goals: [
      makeGoal({
        id: 'g1',
        name: 'Review last week',
        finishedAt: '2026-01-01T10:10:00.000Z',
      }),
      makeGoal({ id: 'g2', name: 'Pick priorities' }),
    ],
    ...over,
  });
}

/** Finished at 10:50, both milestones done. */
export function makeFinishedMeeting(over: Partial<Meeting> = {}): Meeting {
  return makeMeeting({
    status: 'finished',
    realStartTime: T0,
    realEndTime: '2026-01-01T10:50:00.000Z',
    goals: [
      makeGoal({
        id: 'g1',
        name: 'Review last week',
        finishedAt: '2026-01-01T10:20:00.000Z',
      }),
      makeGoal({
        id: 'g2',
        name: 'Pick priorities',
        finishedAt: '2026-01-01T10:45:00.000Z',
      }),
    ],
    ...over,
  });
}

export function makeViewer(over: Partial<Viewer> = {}): Viewer {
  return { uid: 'u1', email: 'ana@example.com', name: 'Ana', photoURL: '', ...over };
}

export function makeAuthUser(over: Partial<AuthUser> = {}): AuthUser {
  return {
    uid: 'u1',
    email: 'ana@example.com',
    displayName: 'Ana',
    photoURL: null,
    ...over,
  };
}

export function makeAccess(over: Partial<AccessSettings> = {}): AccessSettings {
  return { owner: 'u1', visibility: 'private', publicRole: 'viewer', ...over };
}

export function makeMember(over: Partial<Member> = {}): Member {
  return {
    key: 'bruno@example,com',
    email: 'bruno@example.com',
    role: 'viewer',
    addedAt: 1,
    ...over,
  };
}

export function makeRequest(over: Partial<AccessRequest> = {}): AccessRequest {
  return {
    key: 'carla@example,com',
    email: 'carla@example.com',
    name: 'Carla',
    photoURL: '',
    message: 'Can I join?',
    requestedAt: Date.parse(T0),
    ...over,
  };
}

export function makeSharedSummary(
  over: Partial<SharedEventSummary> = {},
): SharedEventSummary {
  return {
    id: 's1',
    name: 'Their retro',
    ownerName: 'Bruno',
    status: 'draft',
    via: 'viewer',
    realStartTime: '',
    realEndTime: '',
    updatedAt: T0,
    ...over,
  };
}
