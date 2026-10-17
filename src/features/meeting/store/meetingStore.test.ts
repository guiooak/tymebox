import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Meeting } from '../domain/types';

vi.mock('../domain/meetingRepository', () => ({
  patchMeeting: vi.fn(async () => {}),
  patchGoal: vi.fn(async () => {}),
  putGoal: vi.fn(async () => {}),
  setGoalOrder: vi.fn(async () => {}),
  resetProgress: vi.fn(async () => {}),
  setCurrentMeetingId: vi.fn(async () => {}),
  newSideTopicKey: vi.fn(() => 'topic-key'),
  putSideTopic: vi.fn(async () => {}),
  shareWith: vi.fn(async () => {}),
  approveRequest: vi.fn(async () => {}),
}));

const repo = await import('../domain/meetingRepository');
const { useMeetingStore } = await import('./meetingStore');

const user = { uid: 'u1', email: 'u1@example.com', name: 'Ana', photoURL: '' };

const meeting: Meeting = {
  id: 'm1',
  owner: 'u1',
  ownerName: 'Ana',
  name: 'Retro',
  description: '',
  expectedStartTime: '2026-01-01T10:00:00Z',
  expectedEndTime: '2026-01-01T11:00:00Z',
  realStartTime: '2026-01-01T10:00:00Z',
  realEndTime: '',
  goals: [
    {
      id: 'g1',
      name: 'Wins',
      weight: 1,
      finishedAt: '2026-01-01T10:10:00Z',
      decisions: 'x',
    },
    { id: 'g2', name: 'Pains', weight: 1, finishedAt: '', decisions: '' },
  ],
  sideTopics: [],
  status: 'active',
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  useMeetingStore.setState({
    user,
    meetings: [meeting],
    currentMeetingId: 'm1',
    currentMeeting: meeting,
    openId: 'm1',
    event: meeting,
    role: 'owner',
  });
});

describe('cancel flow', () => {
  it('marks the event cancelled and lets go of it', async () => {
    await useMeetingStore.getState().cancelMeeting();

    expect(repo.patchMeeting).toHaveBeenCalledWith('m1', {
      realEndTime: '',
      status: 'cancelled',
    });
    expect(repo.setCurrentMeetingId).toHaveBeenCalledWith('u1', null);
  });

  it('reopens a cancelled event as a fresh draft with no completions', async () => {
    const cancelled: Meeting = { ...meeting, status: 'cancelled' };
    useMeetingStore.setState({ meetings: [cancelled], event: null, openId: null });

    await useMeetingStore.getState().reopenInDashboard('m1');

    expect(repo.resetProgress).toHaveBeenCalledWith('m1', cancelled.goals, {
      realStartTime: '',
      realEndTime: '',
      status: 'draft',
    });
    expect(repo.setCurrentMeetingId).toHaveBeenCalledWith('u1', 'm1');
  });
});

describe('editing the open event', () => {
  it('writes one goal at a time', async () => {
    await useMeetingStore
      .getState()
      .updateGoal('g2', { finishedAt: '2026-01-01T10:20:00Z' });
    expect(repo.patchGoal).toHaveBeenCalledWith('m1', 'g2', {
      finishedAt: '2026-01-01T10:20:00Z',
    });
  });

  it('lets a contributor run someone else’s event without moving their own pointer', async () => {
    useMeetingStore.setState({
      role: 'contributor',
      meetings: [],
      currentMeetingId: null,
    });
    await useMeetingStore.getState().cancelMeeting();
    expect(repo.patchMeeting).toHaveBeenCalled();
    expect(repo.setCurrentMeetingId).not.toHaveBeenCalled();
  });

  it('changes nothing for a viewer', async () => {
    useMeetingStore.setState({ role: 'viewer' });
    const state = useMeetingStore.getState();
    await state.updateMeeting({ name: 'Nope' });
    await state.startMeeting();
    await state.updateGoal('g1', { finishedAt: '' });
    expect(state.addSideTopic('')).toBeNull();
    expect(repo.patchMeeting).not.toHaveBeenCalled();
    expect(repo.patchGoal).not.toHaveBeenCalled();
    expect(repo.putSideTopic).not.toHaveBeenCalled();
  });
});

describe('sharing', () => {
  it('lets only the owner share or approve', async () => {
    const request = {
      key: 'b@x,com',
      email: 'b@x.com',
      name: 'B',
      photoURL: '',
      message: '',
      requestedAt: 1,
    };
    await useMeetingStore.getState().shareWith('b@x.com', 'viewer');
    await useMeetingStore.getState().approveRequest(request, 'contributor');
    expect(repo.shareWith).toHaveBeenCalledWith('m1', 'b@x.com', 'viewer');
    expect(repo.approveRequest).toHaveBeenCalledWith('m1', 'u1', request, 'contributor');

    vi.clearAllMocks();
    useMeetingStore.setState({ role: 'contributor' });
    await useMeetingStore.getState().shareWith('c@x.com', 'viewer');
    expect(repo.shareWith).not.toHaveBeenCalled();
  });
});
