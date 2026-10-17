import { addHours, diffMs, nowISO, toISO } from '../../../common/services/datetime';
import { createStore } from '../../../common/services/state';
import { uid as makeId } from '../../../common/services/uid';
import {
  roleFor,
  type AccessRequest,
  type AccessSettings,
  type GrantedRole,
  type Member,
  type Role,
  type Visibility,
} from '../domain/access';
import * as repo from '../domain/meetingRepository';
import {
  createGoal,
  createSideTopic,
  duplicateGoal as cloneGoal,
  moveItem,
  type Goal,
  type Meeting,
  type MeetingStatus,
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

type Unsubscribe = () => void;

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
  sharedEntries: repo.SharedEntry[];
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
  /** Load an event by id; returns the function that closes it. */
  openEvent: (id: string) => Unsubscribe;

  saveDraft: (input: MeetingDraftInput) => Promise<string | null>;
  discardCurrent: () => Promise<void>;
  reopen: (id: string) => Promise<void>;
  reopenInDashboard: (id: string) => Promise<void>;
  clone: (id: string) => Promise<string | null>;
  createFromTemplate: (name: string, goalNames: string[]) => Promise<string | null>;
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

const CLOSED_EVENT = {
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

const SIGNED_OUT = {
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

function toSummary(meeting: Meeting, via: SharedEventSummary['via']): SharedEventSummary {
  return {
    id: meeting.id,
    name: meeting.name,
    ownerName: meeting.ownerName,
    status: meeting.status,
    via,
    realStartTime: meeting.realStartTime,
    realEndTime: meeting.realEndTime,
    updatedAt: meeting.updatedAt,
  };
}

/** Live first, then the most recently changed. */
function sortShared(events: SharedEventSummary[]): SharedEventSummary[] {
  const live = (event: SharedEventSummary) => (event.status === 'active' ? 0 : 1);
  return [...events].sort(
    (a, b) => live(a) - live(b) || (a.updatedAt < b.updatedAt ? 1 : -1),
  );
}

export const useMeetingStore = createStore<MeetingState>()((set, get) => {
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

  return {
    ...SIGNED_OUT,
    ...CLOSED_EVENT,
    decisionsAutomaticBehavior: true,

    bind: (user) => {
      set({ ...SIGNED_OUT, user });
      let ownLoaded = false;
      let userLoaded = false;
      let migrating = false;
      const sharedSubs = new Map<string, Unsubscribe>();
      const summaries = new Map<string, SharedEventSummary>();

      const publishShared = () =>
        set({ sharedEvents: sortShared([...summaries.values()]) });

      // How you reach an event right now: an invite's role wins over a public visit.
      const accessVia = (id: string): SharedEventSummary['via'] =>
        get().sharedEntries.find((entry) => entry.id === id)?.role ?? 'public';

      const refreshCurrent = () => {
        const { meetings, currentMeetingId } = get();
        set({
          currentMeeting:
            meetings.find((meeting) => meeting.id === currentMeetingId) ?? null,
        });
      };

      // Keep one live subscription per event shared with you (or public and
      // visited), and none for events you own.
      const syncShared = () => {
        const { sharedEntries, visitedIds } = get();
        const via = new Map<string, SharedEventSummary['via']>();
        for (const id of visitedIds) {
          via.set(id, 'public');
        }
        for (const entry of sharedEntries) {
          via.set(entry.id, entry.role);
        }
        for (const id of [...via.keys()]) {
          if (isMine(id)) {
            via.delete(id);
          }
        }
        for (const [id, off] of sharedSubs) {
          if (!via.has(id)) {
            off();
            sharedSubs.delete(id);
            summaries.delete(id);
          }
        }
        for (const [id, how] of via) {
          const existing = summaries.get(id);
          if (existing && existing.via !== how) {
            summaries.set(id, { ...existing, via: how });
          }
          if (sharedSubs.has(id)) {
            continue;
          }
          sharedSubs.set(
            id,
            repo.subscribeMeeting(
              id,
              (meeting) => {
                if (meeting) {
                  summaries.set(id, toSummary(meeting, accessVia(id)));
                } else {
                  summaries.delete(id);
                }
                publishShared();
              },
              () => {
                // Access removed, or the event deleted: drop it from the list.
                sharedSubs.delete(id);
                summaries.delete(id);
                publishShared();
                if (get().visitedIds.includes(id)) {
                  void repo.forgetVisit(user.uid, id);
                }
              },
            ),
          );
        }
        publishShared();
      };

      const offOwn = repo.subscribeOwnMeetings(user.uid, (meetings) => {
        ownLoaded = true;
        set({ meetings, loading: !(ownLoaded && userLoaded) });
        refreshCurrent();
        syncShared();
      });

      const offUser = repo.subscribeUserData(user.uid, (data) => {
        userLoaded = true;
        set({
          currentMeetingId: data.currentMeetingId,
          decisionsAutomaticBehavior: data.decisionsAutomaticBehavior,
          visitedIds: data.visitedIds,
          loading: !(ownLoaded && userLoaded),
        });
        refreshCurrent();
        syncShared();
        if (!migrating && Object.keys(data.legacy).length > 0) {
          migrating = true;
          void repo
            .migrateLegacyMeetings(user.uid, user.name, data.legacy)
            .finally(() => {
              migrating = false;
            });
        }
      });

      const offShared = user.email
        ? repo.subscribeSharedWith(user.email, (entries) => {
            set({ sharedEntries: entries, sharedLoading: false });
            syncShared();
          })
        : (set({ sharedLoading: false }), () => {});

      const offRequests = repo.subscribeRequestsByOwner(user.uid, (counts) =>
        set({ requestCounts: counts }),
      );

      return () => {
        offOwn();
        offUser();
        offShared();
        offRequests();
        sharedSubs.forEach((off) => off());
        set({ ...SIGNED_OUT, ...CLOSED_EVENT });
      };
    },

    openEvent: (id) => {
      const user = get().user;
      if (!user) {
        return () => {};
      }
      set({ ...CLOSED_EVENT, openId: id, eventView: 'loading' });

      let disposed = false;
      let offEvent: Unsubscribe | null = null;
      let ownerSubs: Unsubscribe[] = [];
      let visitRecorded = false;

      const startEvent = () => {
        offEvent = repo.subscribeMeeting(
          id,
          (meeting) => {
            if (!disposed) {
              set(
                meeting
                  ? { event: meeting, eventView: 'ready' }
                  : { event: null, eventView: 'denied' },
              );
            }
          },
          () => {
            // Not allowed (or no longer): wait for access to change.
            offEvent = null;
            if (!disposed) {
              set({ event: null, eventView: 'denied' });
            }
          },
        );
      };

      const recompute = () => {
        if (disposed) {
          return;
        }
        const { access, myMember } = get();
        const role = roleFor(access, user, myMember);
        set({ role });

        if (role === 'owner' && ownerSubs.length === 0) {
          ownerSubs = [
            repo.subscribeMembers(id, (members) => set({ members })),
            repo.subscribeRequests(id, (requests) => set({ requests })),
          ];
        } else if (role !== 'owner' && ownerSubs.length > 0) {
          ownerSubs.forEach((off) => off());
          ownerSubs = [];
          set({ members: [], requests: [] });
        }

        // Access granted (an approved request, a new share, made public) after a
        // refusal: load the event now.
        if (role && !offEvent) {
          startEvent();
        }

        if (
          !visitRecorded &&
          role &&
          role !== 'owner' &&
          !myMember &&
          access?.visibility === 'public'
        ) {
          visitRecorded = true;
          void repo.recordVisit(user.uid, id);
        }
      };

      startEvent();
      const offAccess = repo.subscribeAccessSettings(id, (access) => {
        set({ access });
        recompute();
      });
      const offMember = user.email
        ? repo.subscribeMyMembership(id, user.email, (myMember) => {
            set({ myMember });
            recompute();
          })
        : () => {};
      const offRequest = user.email
        ? repo.subscribeMyRequest(id, user.email, (myRequest) => set({ myRequest }))
        : () => {};

      return () => {
        disposed = true;
        offEvent?.();
        offAccess();
        offMember();
        offRequest();
        ownerSubs.forEach((off) => off());
        if (get().openId === id) {
          set(CLOSED_EVENT);
        }
      };
    },

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

    reopen: async (id) => {
      const user = requireUser();
      if (isMine(id)) {
        await repo.setCurrentMeetingId(user.uid, id);
      }
    },

    // "Open dashboard" from history: a finished event goes back to running so it
    // can be picked up again, mirroring the report's "Back to dashboard".
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
        name: `${source.name} (copy)`,
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

    setAutomatic: async (value) => {
      const user = requireUser();
      set({ decisionsAutomaticBehavior: value });
      await repo.setAutomaticBehavior(user.uid, value);
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

    updateGoal: async (goalId, patch) => {
      const event = editable();
      if (!event) {
        return;
      }
      const { id: _id, ...fields } = patch;
      await repo.patchGoal(event.id, goalId, fields);
    },

    addGoal: async (name, weight = 1) => {
      const event = editable();
      if (event) {
        await repo.putGoal(event.id, createGoal(name, weight), event.goals.length);
      }
    },

    removeGoal: async (goalId) => {
      const event = editable();
      if (event) {
        await repo.deleteGoal(event.id, goalId);
      }
    },

    duplicateGoal: async (goalId) => {
      const event = editable();
      if (!event) {
        return;
      }
      const index = event.goals.findIndex((goal) => goal.id === goalId);
      if (index < 0) {
        return;
      }
      const copy = cloneGoal(event.goals[index]);
      const goals = [
        ...event.goals.slice(0, index + 1),
        copy,
        ...event.goals.slice(index + 1),
      ];
      await repo.putGoal(event.id, copy, index + 1);
      await repo.setGoalOrder(event.id, goals);
    },

    moveGoal: async (goalId, offset) => {
      const event = editable();
      if (!event) {
        return;
      }
      const from = event.goals.findIndex((goal) => goal.id === goalId);
      if (from >= 0) {
        await repo.setGoalOrder(event.id, moveItem(event.goals, from, from + offset));
      }
    },

    reorderGoals: async (from, to) => {
      const event = editable();
      if (event) {
        await repo.setGoalOrder(event.id, moveItem(event.goals, from, to));
      }
    },

    // One topic per write, at its own path, so an add can never be undone by an
    // older copy of the list landing later.
    addSideTopic: (goalName) => {
      const event = editable();
      if (!event) {
        return null;
      }
      const key = repo.newSideTopicKey(event.id);
      // Fire and forget: a rejected write surfaces through SaveErrorToast.
      void repo.putSideTopic(event.id, key, createSideTopic(goalName));
      return key;
    },

    updateSideTopic: async (key, value) => {
      const event = editable();
      if (event) {
        await repo.setSideTopicValue(event.id, key, value);
      }
    },

    removeSideTopic: async (key) => {
      const event = editable();
      if (event) {
        await repo.deleteSideTopic(event.id, key);
      }
    },

    setVisibility: async (visibility, publicRole) => {
      const event = ownerEvent();
      if (event) {
        await repo.setVisibility(event.id, visibility, publicRole);
      }
    },

    shareWith: async (email, role) => {
      const event = ownerEvent();
      if (event) {
        await repo.shareWith(event.id, email, role);
      }
    },

    setMemberRole: async (member, role) => {
      const event = ownerEvent();
      if (event) {
        await repo.setMemberRole(event.id, member, role);
      }
    },

    unshare: async (member) => {
      const event = ownerEvent();
      if (event) {
        await repo.unshare(event.id, member.key);
      }
    },

    approveRequest: async (request, role) => {
      const event = ownerEvent();
      if (event) {
        await repo.approveRequest(event.id, event.owner, request, role);
      }
    },

    denyRequest: async (request) => {
      const event = ownerEvent();
      if (event) {
        await repo.denyRequest(event.id, event.owner, request);
      }
    },

    requestAccess: async (message) => {
      const user = requireUser();
      const { openId, access } = get();
      if (!openId || !access) {
        throw new Error('This event can’t take access requests');
      }
      await repo.requestAccess(
        openId,
        access.owner,
        { email: user.email, name: user.name, photoURL: user.photoURL },
        message,
      );
    },

    cancelAccessRequest: async () => {
      const user = requireUser();
      const { openId, access } = get();
      if (openId && access) {
        await repo.cancelAccessRequest(openId, access.owner, user.email);
      }
    },
  };
});
