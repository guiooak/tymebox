import type { StoreApi } from '../../../common/services/state';
import type { Locale } from '../../../common/services/i18n';
import type {
  AccessRequest,
  AccessSettings,
  GrantedRole,
  Member,
  Role,
  Visibility,
} from '../domain/access';
import type { SharedEntry } from '../domain/meetingRepository';
import type { Goal, Meeting, MeetingStatus } from '../domain/types';

/** The only two things asked for up front — everything else is filled in on the board. */
export type MeetingDraftInput = {
  name: string;
  description: string;
};

/** Fields the dashboard can edit inline at any point in the event's life. */
export type MeetingEditableFields = Partial<
  Pick<Meeting, 'name' | 'description' | 'expectedStartTime' | 'expectedEndTime'>
>;

export type Viewer = {
  uid: string;
  email: string;
  name: string;
  photoURL: string;
};

/** An event someone else owns, as listed under "Shared with me". */
export type SharedEventSummary = {
  id: string;
  name: string;
  ownerName: string;
  status: MeetingStatus;
  /** Your role through an invite; 'public' when you came in through a public link. */
  via: GrantedRole | 'public';
  realStartTime: string;
  realEndTime: string;
  updatedAt: string;
};

/** Where the open event stands: still loading, readable, or not for you. */
export type EventView = 'idle' | 'loading' | 'ready' | 'denied';

export type Unsubscribe = () => void;

export type MeetingState = {
  user: Viewer | null;
  /** True until the first snapshot of your own events and settings. */
  loading: boolean;
  /** Events you own. */
  meetings: Meeting[];
  currentMeetingId: string | null;
  /** Your "resume" event: one of yours, pointed to by currentMeetingId. */
  currentMeeting: Meeting | null;
  decisionsAutomaticBehavior: boolean;
  visitedIds: string[];
  sharedEntries: SharedEntry[];
  sharedEvents: SharedEventSummary[];
  sharedLoading: boolean;
  /** Pending access requests on your events, by event id. */
  requestCounts: Record<string, number>;

  /* The event open on the dashboard or report. */
  openId: string | null;
  event: Meeting | null;
  eventView: EventView;
  access: AccessSettings | null;
  myMember: Member | null;
  role: Role | null;
  /** Owner only. */
  members: Member[];
  /** Owner only. */
  requests: AccessRequest[];
  /** Your own pending request, when you have no access. */
  myRequest: AccessRequest | null;

  bind: (user: Viewer) => Unsubscribe;
  /** End the live subscriptions now, before the account goes away, so none
   * writes back into a profile being deleted. */
  release: () => void;
  /** Load an event by id; returns the function that closes it. */
  openEvent: (id: string) => Unsubscribe;

  saveDraft: (input: MeetingDraftInput) => Promise<string | null>;
  discardCurrent: () => Promise<void>;
  /** Owner only: delete one of your events for good, with its shares. */
  deleteEvent: (id: string) => Promise<void>;
  reopen: (id: string) => Promise<void>;
  reopenInDashboard: (id: string) => Promise<void>;
  clone: (id: string) => Promise<string | null>;
  createFromTemplate: (name: string, goalNames: string[]) => Promise<string | null>;
  /** Switch the interface language; signed in, it's saved to the profile too. */
  chooseLocale: (locale: Locale) => Promise<void>;
  setAutomatic: (value: boolean) => Promise<void>;

  updateMeeting: (patch: MeetingEditableFields) => Promise<void>;
  startMeeting: () => Promise<void>;
  cancelMeeting: () => Promise<void>;
  finishMeeting: () => Promise<void>;
  backToDashboard: () => Promise<void>;
  updateGoal: (goalId: string, patch: Partial<Goal>) => Promise<void>;
  addGoal: (name: string, weight?: number) => Promise<void>;
  removeGoal: (goalId: string) => Promise<void>;
  duplicateGoal: (goalId: string) => Promise<void>;
  moveGoal: (goalId: string, offset: number) => Promise<void>;
  reorderGoals: (from: number, to: number) => Promise<void>;
  /** Parks a new topic and returns its key (null without an open event). */
  addSideTopic: (goalName: string) => string | null;
  updateSideTopic: (key: string, value: string) => Promise<void>;
  removeSideTopic: (key: string) => Promise<void>;

  setVisibility: (visibility: Visibility, publicRole: GrantedRole) => Promise<void>;
  shareWith: (email: string, role: GrantedRole) => Promise<void>;
  setMemberRole: (member: Member, role: GrantedRole) => Promise<void>;
  unshare: (member: Member) => Promise<void>;
  approveRequest: (request: AccessRequest, role: GrantedRole) => Promise<void>;
  denyRequest: (request: AccessRequest) => Promise<void>;
  requestAccess: (message: string) => Promise<void>;
  cancelAccessRequest: () => Promise<void>;
};

/** What a slice or subscription gets to read and write the store. */
export type StoreAccess = {
  set: StoreApi<MeetingState>['setState'];
  get: () => MeetingState;
};
