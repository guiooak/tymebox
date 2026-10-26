import {
  eventPath,
  eventReportPath,
  useNavigation,
} from '../../../common/services/router';
import type { Meeting } from '../domain/types';
import { useMeetingStore } from '../store';
import { useDeleteEvent } from './useDeleteEvent';

/** What a list row can do with one of your events, each going where it leads. */
export function useEventActions(meeting: Meeting) {
  const navigation = useNavigation();
  const reopen = useMeetingStore((state) => state.reopen);
  const reopenInDashboard = useMeetingStore((state) => state.reopenInDashboard);
  const cloneEvent = useMeetingStore((state) => state.clone);
  const deleteEvent = useDeleteEvent();
  const { id } = meeting;

  return {
    /** Finished events open their report, the rest their board, without
     * reopening anything. */
    open: async () => {
      await reopen(id);
      navigation.go(meeting.realEndTime ? eventReportPath(id) : eventPath(id));
    },
    openReport: async () => {
      await reopen(id);
      navigation.go(eventReportPath(id));
    },
    openBoard: async () => {
      await reopen(id);
      navigation.go(eventPath(id));
    },
    /** Back to running (see the store's reopenInDashboard), then to the board. */
    runOnBoard: async () => {
      await reopenInDashboard(id);
      navigation.go(eventPath(id));
    },
    clone: async () => {
      const newId = await cloneEvent(id);
      if (newId) {
        navigation.go(eventPath(newId));
      }
    },
    remove: () => deleteEvent(meeting),
  };
}
