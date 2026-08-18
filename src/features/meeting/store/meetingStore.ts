import { addHours, diffMs, nowISO, toISO } from '../../../common/services/datetime';
import { createStore } from '../../../common/services/state';
import { uid as makeId } from '../../../common/services/uid';
import * as repo from '../domain/meetingRepository';
import {
  createGoal,
  duplicateGoal as cloneGoal,
  moveItem,
  type Goal,
  type Meeting,
  type SideTopic,
} from '../domain/types';

/** The only two things asked for up front — everything else is filled in on the board. */
export type MeetingDraftInput = {
  name: string;
  description: string;
};

/** Fields the dashboard can edit inline at any point in the event's life. */
export type MeetingEditableFields = Partial<
  Pick<Meeting, 'name' | 'description' | 'expectedStartTime' | 'expectedEndTime'>
>;

export type MeetingState = {
  uid: string | null;
  loading: boolean;
  currentMeeting: Meeting | null;
  meetings: Meeting[];
  decisionsAutomaticBehavior: boolean;

  bind: (uid: string) => () => void;

  saveDraft: (input: MeetingDraftInput) => Promise<void>;
  updateMeeting: (patch: MeetingEditableFields) => Promise<void>;
  discardCurrent: () => Promise<void>;
  startMeeting: () => Promise<void>;
  cancelMeeting: () => Promise<void>;
  finishMeeting: () => Promise<void>;
  backToDashboard: () => Promise<void>;
  updateGoals: (goals: Goal[]) => Promise<void>;
  updateGoal: (goalId: string, patch: Partial<Goal>) => Promise<void>;
  addGoal: (name: string, weight?: number) => Promise<void>;
  removeGoal: (goalId: string) => Promise<void>;
  duplicateGoal: (goalId: string) => Promise<void>;
  moveGoal: (goalId: string, offset: number) => Promise<void>;
  reorderGoals: (from: number, to: number) => Promise<void>;
  setSideTopics: (sideTopics: SideTopic[]) => Promise<void>;
  setAutomatic: (value: boolean) => Promise<void>;
  reopen: (id: string) => Promise<void>;
  reopenInDashboard: (id: string) => Promise<void>;
  clone: (id: string) => Promise<string | null>;
  createFromTemplate: (name: string, goalNames: string[]) => Promise<string | null>;
};

export const useMeetingStore = createStore<MeetingState>()((set, get) => {
  const requireUid = (): string => {
    const { uid } = get();
    if (!uid) {
      throw new Error('Meeting store is not bound to a user');
    }
    return uid;
  };

  /** Run `mutate` over the current meeting's goals and persist the result. */
  const patchGoals = async (mutate: (goals: Goal[]) => Goal[]): Promise<void> => {
    const uid = requireUid();
    const current = get().currentMeeting;
    if (!current) {
      return;
    }
    await repo.patchMeeting(uid, current.id, { goals: mutate(current.goals) });
  };

  return {
    uid: null,
    loading: true,
    currentMeeting: null,
    meetings: [],
    decisionsAutomaticBehavior: true,

    bind: (uid) => {
      set({ uid, loading: true });
      const unsubscribe = repo.subscribeUserData(uid, (data) => {
        const current =
          data.meetings.find((meeting) => meeting.id === data.currentMeetingId) ?? null;
        set({
          loading: false,
          currentMeeting: current,
          meetings: data.meetings,
          decisionsAutomaticBehavior: data.decisionsAutomaticBehavior,
        });
      });
      return () => {
        unsubscribe();
        set({ uid: null, currentMeeting: null, meetings: [], loading: true });
      };
    },

    // Creating an event costs a title and (optionally) a description. Times and
    // milestones are added on the board, Trello-style.
    saveDraft: async (input) => {
      const uid = requireUid();
      const existing = get().currentMeeting;
      const reuse = existing && existing.status === 'draft' ? existing : null;

      if (reuse) {
        await repo.patchMeeting(uid, reuse.id, {
          name: input.name,
          description: input.description,
        });
        await repo.setCurrentMeetingId(uid, reuse.id);
        return;
      }

      const id = repo.newMeetingId(uid);
      const meeting: Meeting = {
        id,
        name: input.name,
        description: input.description,
        expectedStartTime: '',
        expectedEndTime: '',
        realStartTime: '',
        realEndTime: '',
        goals: [],
        sideTopics: [],
        status: 'draft',
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };

      await repo.saveMeeting(uid, meeting);
      await repo.setCurrentMeetingId(uid, id);
    },

    updateMeeting: async (patch) => {
      const uid = requireUid();
      const current = get().currentMeeting;
      if (!current) {
        return;
      }
      await repo.patchMeeting(uid, current.id, patch);
    },

    discardCurrent: async () => {
      const uid = requireUid();
      const current = get().currentMeeting;
      if (current && current.status === 'draft') {
        await repo.removeMeeting(uid, current.id);
      }
      await repo.setCurrentMeetingId(uid, null);
    },

    // Starting is the moment a schedule becomes mandatory: anything still unset
    // falls back to "now" and a one-hour box, both editable from the dashboard.
    startMeeting: async () => {
      const uid = requireUid();
      const current = get().currentMeeting;
      if (!current) {
        return;
      }
      const startedAt = nowISO();
      const expectedStartTime = current.expectedStartTime || startedAt;
      const expectedEndTime =
        current.expectedEndTime || toISO(addHours(expectedStartTime, 1));

      await repo.patchMeeting(uid, current.id, {
        expectedStartTime,
        expectedEndTime,
        realStartTime: startedAt,
        status: 'active',
      });
    },

    cancelMeeting: async () => {
      const uid = requireUid();
      const current = get().currentMeeting;
      if (!current) {
        return;
      }
      await repo.patchMeeting(uid, current.id, { realStartTime: '', status: 'draft' });
    },

    finishMeeting: async () => {
      const uid = requireUid();
      const current = get().currentMeeting;
      if (!current) {
        return;
      }
      // Keep it as the current meeting so the report can render it; it stays in
      // `meetings` as history. `discardCurrent` (Start new) clears the pointer.
      await repo.patchMeeting(uid, current.id, {
        realEndTime: nowISO(),
        status: 'finished',
      });
    },

    backToDashboard: async () => {
      const uid = requireUid();
      const current = get().currentMeeting;
      if (!current) {
        return;
      }
      await repo.patchMeeting(uid, current.id, { realEndTime: '', status: 'active' });
      await repo.setCurrentMeetingId(uid, current.id);
    },

    updateGoals: async (goals) => {
      await patchGoals(() => goals);
    },

    updateGoal: async (goalId, patch) => {
      await patchGoals((goals) =>
        goals.map((goal) => (goal.id === goalId ? { ...goal, ...patch } : goal)),
      );
    },

    addGoal: async (name, weight = 1) => {
      await patchGoals((goals) => [...goals, createGoal(name, weight)]);
    },

    removeGoal: async (goalId) => {
      await patchGoals((goals) => goals.filter((goal) => goal.id !== goalId));
    },

    duplicateGoal: async (goalId) => {
      await patchGoals((goals) => {
        const index = goals.findIndex((goal) => goal.id === goalId);
        if (index < 0) {
          return goals;
        }
        return [
          ...goals.slice(0, index + 1),
          cloneGoal(goals[index]),
          ...goals.slice(index + 1),
        ];
      });
    },

    moveGoal: async (goalId, offset) => {
      await patchGoals((goals) => {
        const from = goals.findIndex((goal) => goal.id === goalId);
        return from < 0 ? goals : moveItem(goals, from, from + offset);
      });
    },

    reorderGoals: async (from, to) => {
      await patchGoals((goals) => moveItem(goals, from, to));
    },

    setSideTopics: async (sideTopics) => {
      const uid = requireUid();
      const current = get().currentMeeting;
      if (!current) {
        return;
      }
      await repo.patchMeeting(uid, current.id, { sideTopics });
    },

    setAutomatic: async (value) => {
      const uid = requireUid();
      set({ decisionsAutomaticBehavior: value });
      await repo.setAutomaticBehavior(uid, value);
    },

    reopen: async (id) => {
      const uid = requireUid();
      await repo.setCurrentMeetingId(uid, id);
    },

    // "Open dashboard" from history: a finished event goes back to running so it
    // can be picked up again, mirroring the report's "Back to dashboard".
    reopenInDashboard: async (id) => {
      const uid = requireUid();
      const source = get().meetings.find((meeting) => meeting.id === id);
      if (source?.realEndTime) {
        await repo.patchMeeting(uid, id, { realEndTime: '', status: 'active' });
      }
      await repo.setCurrentMeetingId(uid, id);
    },

    clone: async (id) => {
      const uid = requireUid();
      const source = get().meetings.find((meeting) => meeting.id === id);
      if (!source) {
        return null;
      }
      const newId = repo.newMeetingId(uid);
      const durationMs = diffMs(source.expectedEndTime, source.expectedStartTime);
      const start = new Date();
      const end =
        durationMs > 0 ? new Date(start.getTime() + durationMs) : addHours(start, 1);

      const meeting: Meeting = {
        id: newId,
        name: `${source.name} (copy)`,
        description: source.description,
        expectedStartTime: toISO(start),
        expectedEndTime: toISO(end),
        realStartTime: '',
        realEndTime: '',
        goals: source.goals.map((goal) => ({
          id: makeId(),
          name: goal.name,
          weight: goal.weight,
          finishedAt: '',
          decisions: '',
        })),
        sideTopics: source.sideTopics.map((topic) => ({
          id: makeId(),
          value: topic.value,
          goalName: topic.goalName,
        })),
        status: 'draft',
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };

      await repo.saveMeeting(uid, meeting);
      await repo.setCurrentMeetingId(uid, newId);
      return newId;
    },

    createFromTemplate: async (name, goalNames) => {
      const uid = requireUid();
      const id = repo.newMeetingId(uid);
      const meeting: Meeting = {
        id,
        name,
        description: '',
        expectedStartTime: '',
        expectedEndTime: '',
        realStartTime: '',
        realEndTime: '',
        goals: goalNames.map((goalName) => createGoal(goalName)),
        sideTopics: [],
        status: 'draft',
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      await repo.saveMeeting(uid, meeting);
      await repo.setCurrentMeetingId(uid, id);
      return id;
    },
  };
});
