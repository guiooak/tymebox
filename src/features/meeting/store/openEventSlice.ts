import { addHours, nowISO, toISO } from '../../../common/services/datetime';
import * as repo from '../domain/meetingRepository';
import { CLOSED_EVENT, type Slice } from './context';
import { watchOpenEvent } from './openEventSubscriptions';

/** The event open on the dashboard or report, and its lifecycle. */
export const openEventSlice: Slice<
  | 'openEvent'
  | 'reopen'
  | 'reopenInDashboard'
  | 'updateMeeting'
  | 'startMeeting'
  | 'cancelMeeting'
  | 'finishMeeting'
  | 'backToDashboard'
> = (store, { requireUser, editable, isMine }) => {
  const { set, get } = store;
  return {
    openEvent: (id) => {
      const user = get().user;
      if (!user) {
        return () => {};
      }
      set({ ...CLOSED_EVENT, openId: id, eventView: 'loading' });
      return watchOpenEvent(store, user, id);
    },

    reopen: async (id) => {
      const user = requireUser();
      if (isMine(id)) {
        await repo.setCurrentMeetingId(user.uid, id);
      }
    },

    // "Open dashboard" from history: a finished event goes back to running so it
    // can be picked up again, mirroring the report's "Reopen event".
    reopenInDashboard: async (id) => {
      const user = requireUser();
      const source = get().meetings.find((meeting) => meeting.id === id);
      if (!source) {
        return;
      }
      if (source.status === 'cancelled') {
        // Run it again from scratch: the aborted run's completions would
        // otherwise show up on the new burndown and report.
        await repo.resetProgress(id, source.goals, {
          realStartTime: '',
          realEndTime: '',
          status: 'draft',
        });
      } else if (source.realEndTime) {
        await repo.patchMeeting(id, { realEndTime: '', status: 'active' });
      }
      await repo.setCurrentMeetingId(user.uid, id);
    },

    updateMeeting: async (patch) => {
      const event = editable();
      if (event) {
        await repo.patchMeeting(event.id, patch);
      }
    },

    // Starting is the moment a schedule becomes mandatory: anything still unset
    // falls back to "now" and a one-hour box, both editable from the dashboard.
    startMeeting: async () => {
      const event = editable();
      if (!event) {
        return;
      }
      const startedAt = nowISO();
      const expectedStartTime = event.expectedStartTime || startedAt;
      const expectedEndTime =
        event.expectedEndTime || toISO(addHours(expectedStartTime, 1));
      await repo.patchMeeting(event.id, {
        expectedStartTime,
        expectedEndTime,
        realStartTime: startedAt,
        status: 'active',
      });
    },

    cancelMeeting: async () => {
      const event = editable();
      if (!event) {
        return;
      }
      // A cancelled event stays in history as it was left; "Open dashboard"
      // turns it back into a fresh draft (see `reopenInDashboard`).
      await repo.patchMeeting(event.id, { realEndTime: '', status: 'cancelled' });
      const user = requireUser();
      if (get().currentMeetingId === event.id) {
        await repo.setCurrentMeetingId(user.uid, null);
      }
    },

    finishMeeting: async () => {
      const event = editable();
      if (event) {
        await repo.patchMeeting(event.id, { realEndTime: nowISO(), status: 'finished' });
      }
    },

    backToDashboard: async () => {
      const event = editable();
      if (!event) {
        return;
      }
      await repo.patchMeeting(event.id, { realEndTime: '', status: 'active' });
      if (isMine(event.id)) {
        await repo.setCurrentMeetingId(requireUser().uid, event.id);
      }
    },
  };
};
