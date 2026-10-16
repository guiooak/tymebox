import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Meeting } from '../domain/types';

vi.mock('../domain/meetingRepository', () => ({
  patchMeeting: vi.fn(async () => {}),
  setCurrentMeetingId: vi.fn(async () => {}),
  subscribeUserData: vi.fn(() => () => {}),
  saveMeeting: vi.fn(async () => {}),
  removeMeeting: vi.fn(async () => {}),
  newMeetingId: vi.fn(() => 'new-id'),
  setAutomaticBehavior: vi.fn(async () => {}),
}));

const repo = await import('../domain/meetingRepository');
const { useMeetingStore } = await import('./meetingStore');

const meeting: Meeting = {
  id: 'm1',
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

describe('meetingStore cancel flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMeetingStore.setState({ uid: 'u1', currentMeeting: meeting, meetings: [meeting] });
  });

  it('marks the event cancelled and lets go of it', async () => {
    await useMeetingStore.getState().cancelMeeting();

    expect(repo.patchMeeting).toHaveBeenCalledWith('u1', 'm1', {
      realEndTime: '',
      status: 'cancelled',
    });
    expect(repo.setCurrentMeetingId).toHaveBeenCalledWith('u1', null);
  });

  it('reopens a cancelled event as a fresh draft with no completions', async () => {
    const cancelled: Meeting = { ...meeting, status: 'cancelled' };
    useMeetingStore.setState({ currentMeeting: null, meetings: [cancelled] });

    await useMeetingStore.getState().reopenInDashboard('m1');

    expect(repo.patchMeeting).toHaveBeenCalledWith('u1', 'm1', {
      realStartTime: '',
      realEndTime: '',
      status: 'draft',
      goals: meeting.goals.map((goal) => ({ ...goal, finishedAt: '' })),
    });
    expect(repo.setCurrentMeetingId).toHaveBeenCalledWith('u1', 'm1');
  });
});
