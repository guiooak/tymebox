import { addHours, diffMs, toISO } from '../../../common/services/datetime';
import { getT, useI18nStore } from '../../../common/services/i18n';
import { uid as makeId } from '../../../common/services/uid';
import * as repo from '../domain/meetingRepository';
import { createGoal } from '../domain/types';
import { CLOSED_EVENT, SIGNED_OUT, type Slice } from './context';
import { watchSession } from './sessionSubscriptions';
import type { Unsubscribe } from './types';

/** The running bind's cleanup, for release(). */
let unbind: Unsubscribe | null = null;

/** Who is signed in, their events and settings, and creating or deleting events. */
export const sessionSlice: Slice<
  | 'bind'
  | 'release'
  | 'saveDraft'
  | 'discardCurrent'
  | 'deleteEvent'
  | 'clone'
  | 'createFromTemplate'
  | 'chooseLocale'
  | 'setAutomatic'
> = (store, { requireUser, newMeeting }) => {
  const { set, get } = store;
  return {
    bind: (user) => {
      set({ ...SIGNED_OUT, user });
      const stop = watchSession(store, user, (id) =>
        get().meetings.some((meeting) => meeting.id === id),
      );
      let bound = true;
      const cleanup = () => {
        if (!bound) {
          return;
        }
        bound = false;
        unbind = null;
        stop();
        set({ ...SIGNED_OUT, ...CLOSED_EVENT });
      };
      unbind = cleanup;
      return cleanup;
    },

    release: () => unbind?.(),

    // Creating an event costs a title and (optionally) a description. Times and
    // milestones are added on the board, Trello-style.
    saveDraft: async (input) => {
      const user = requireUser();
      const existing = get().currentMeeting;
      if (existing && existing.status === 'draft') {
        await repo.patchMeeting(existing.id, {
          name: input.name,
          description: input.description,
        });
        await repo.setCurrentMeetingId(user.uid, existing.id);
        return existing.id;
      }
      const meeting = newMeeting({ name: input.name, description: input.description });
      await repo.createMeeting(meeting);
      await repo.setCurrentMeetingId(user.uid, meeting.id);
      return meeting.id;
    },

    deleteEvent: async (id) => {
      const user = requireUser();
      const meeting = get().meetings.find((item) => item.id === id);
      if (!meeting || meeting.owner !== user.uid) {
        return;
      }
      if (get().currentMeetingId === id) {
        await repo.setCurrentMeetingId(user.uid, null);
      }
      await repo.deleteMeetingEverywhere(meeting);
    },

    discardCurrent: async () => {
      const user = requireUser();
      const current = get().currentMeeting;
      if (current && current.status === 'draft') {
        const open = get().openId === current.id;
        await repo.deleteMeeting(
          current,
          open ? get().members : [],
          open ? get().requests : [],
        );
      }
      await repo.setCurrentMeetingId(user.uid, null);
    },

    clone: async (id) => {
      const user = requireUser();
      const source =
        get().meetings.find((meeting) => meeting.id === id) ??
        (get().event?.id === id ? get().event : null);
      if (!source) {
        return null;
      }
      const durationMs = diffMs(source.expectedEndTime, source.expectedStartTime);
      const start = new Date();
      const end =
        durationMs > 0 ? new Date(start.getTime() + durationMs) : addHours(start, 1);

      const meeting = newMeeting({
        name: getT().events.copyName(source.name),
        description: source.description,
        expectedStartTime: toISO(start),
        expectedEndTime: toISO(end),
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
      });
      await repo.createMeeting(meeting);
      await repo.setCurrentMeetingId(user.uid, meeting.id);
      return meeting.id;
    },

    createFromTemplate: async (name, goalNames) => {
      const user = requireUser();
      const meeting = newMeeting({
        name,
        goals: goalNames.map((goalName) => createGoal(goalName)),
      });
      await repo.createMeeting(meeting);
      await repo.setCurrentMeetingId(user.uid, meeting.id);
      return meeting.id;
    },

    chooseLocale: async (locale) => {
      useI18nStore.getState().setLocale(locale);
      const user = get().user;
      if (user) {
        await repo.setUserLocale(user.uid, locale);
      }
    },

    setAutomatic: async (value) => {
      const user = requireUser();
      set({ decisionsAutomaticBehavior: value });
      await repo.setAutomaticBehavior(user.uid, value);
    },
  };
};
