import { createStore } from '../../../common/services/state';
import { CLOSED_EVENT, createHelpers, SIGNED_OUT } from './context';
import { goalsSlice } from './goalsSlice';
import { openEventSlice } from './openEventSlice';
import { sessionSlice } from './sessionSlice';
import { sharingSlice } from './sharingSlice';
import type { MeetingState } from './types';

export type {
  EventView,
  MeetingDraftInput,
  MeetingEditableFields,
  MeetingState,
  SharedEventSummary,
  Viewer,
} from './types';

/**
 * One store for meetings, composed from slices:
 * - session: who is signed in, their events, settings and what's shared with them;
 * - openEvent: the event on the dashboard or report and its lifecycle;
 * - goals: its goals (milestones) and side topics (parking lot);
 * - sharing: its visibility, members and access requests.
 */
export const useMeetingStore = createStore<MeetingState>()((set, get) => {
  const store = { set, get };
  const helpers = createHelpers(store);
  return {
    ...SIGNED_OUT,
    ...CLOSED_EVENT,
    decisionsAutomaticBehavior: true,
    ...sessionSlice(store, helpers),
    ...openEventSlice(store, helpers),
    ...goalsSlice(store, helpers),
    ...sharingSlice(store, helpers),
  };
});
