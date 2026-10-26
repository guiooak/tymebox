import { nowISO } from '../../../common/services/datetime';
import * as repo from '../domain/meetingRepository';
import type { Meeting } from '../domain/types';
import type { EventView, MeetingState, StoreAccess, Viewer } from './types';

export const CLOSED_EVENT = {
  openId: null,
  event: null,
  eventView: 'idle' as EventView,
  access: null,
  myMember: null,
  role: null,
  members: [],
  requests: [],
  myRequest: null,
};

export const SIGNED_OUT = {
  user: null,
  loading: true,
  meetings: [],
  currentMeetingId: null,
  currentMeeting: null,
  visitedIds: [],
  sharedEntries: [],
  sharedEvents: [],
  sharedLoading: true,
  requestCounts: {},
};

/** Lookups every slice shares. */
export function createHelpers({ get }: StoreAccess) {
  const requireUser = (): Viewer => {
    const { user } = get();
    if (!user) {
      throw new Error('Meeting store is not bound to a user');
    }
    return user;
  };

  /** The open event, if you may change it. */
  const editable = (): Meeting | null => {
    const { event, role } = get();
    return event && (role === 'owner' || role === 'contributor') ? event : null;
  };

  const ownerEvent = (): Meeting | null => {
    const { event, role } = get();
    return event && role === 'owner' ? event : null;
  };

  const isMine = (id: string) => get().meetings.some((meeting) => meeting.id === id);

  const newMeeting = (fields: Partial<Meeting>): Meeting => {
    const user = requireUser();
    return {
      id: repo.newMeetingId(),
      owner: user.uid,
      ownerName: user.name,
      name: '',
      description: '',
      expectedStartTime: '',
      expectedEndTime: '',
      realStartTime: '',
      realEndTime: '',
      goals: [],
      sideTopics: [],
      status: 'draft',
      createdAt: nowISO(),
      updatedAt: nowISO(),
      ...fields,
    };
  };

  return { requireUser, editable, ownerEvent, isMine, newMeeting };
}

export type Helpers = ReturnType<typeof createHelpers>;

/** A slice: some of the store's actions, built over shared access and helpers. */
export type Slice<K extends keyof MeetingState> = (
  store: StoreAccess,
  helpers: Helpers,
) => Pick<MeetingState, K>;
