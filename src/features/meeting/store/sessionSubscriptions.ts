import { useI18nStore } from '../../../common/services/i18n';
import * as repo from '../domain/meetingRepository';
import type { Meeting } from '../domain/types';
import type { SharedEventSummary, StoreAccess, Unsubscribe, Viewer } from './types';

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

/** One bind: the store, who is signed in, and what has loaded so far. */
type Session = {
  store: StoreAccess;
  user: Viewer;
  loaded: { own: boolean; user: boolean };
  syncShared: () => void;
};

const isLoading = ({ loaded }: Session) => !(loaded.own && loaded.user);

/** Point currentMeeting at the event currentMeetingId names, if it's yours. */
function refreshCurrent({ set, get }: StoreAccess) {
  const { meetings, currentMeetingId } = get();
  set({
    currentMeeting: meetings.find((meeting) => meeting.id === currentMeetingId) ?? null,
  });
}

/**
 * Keeps one live subscription per event shared with you (or public and
 * visited), and none for events you own. `sync` reconciles after any list
 * changes; `stop` closes them all.
 */
function createSharedEventsSync(
  { set, get }: StoreAccess,
  user: Viewer,
  isMine: (id: string) => boolean,
) {
  const sharedSubs = new Map<string, Unsubscribe>();
  const summaries = new Map<string, SharedEventSummary>();

  const publishShared = () => set({ sharedEvents: sortShared([...summaries.values()]) });

  // How you reach an event right now: an invite's role wins over a public visit.
  const accessVia = (id: string): SharedEventSummary['via'] =>
    get().sharedEntries.find((entry) => entry.id === id)?.role ?? 'public';

  const subscribeShared = (id: string) =>
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
    );

  const sync = () => {
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
      if (!sharedSubs.has(id)) {
        sharedSubs.set(id, subscribeShared(id));
      }
    }
    publishShared();
  };

  const stop = () => sharedSubs.forEach((off) => off());

  return { sync, stop };
}

function watchOwnMeetings(session: Session): Unsubscribe {
  const { store, user } = session;
  return repo.subscribeOwnMeetings(user.uid, (meetings) => {
    session.loaded.own = true;
    store.set({ meetings, loading: isLoading(session) });
    refreshCurrent(store);
    session.syncShared();
  });
}

/**
 * The profile's language wins, so an account looks the same on every device.
 * With none saved yet, keep what was picked here (e.g. on the landing page)
 * and save it to the profile.
 */
function applyProfileLocale(uid: string, locale: repo.UserData['locale']) {
  const i18n = useI18nStore.getState();
  if (locale) {
    if (locale !== i18n.locale) {
      i18n.setLocale(locale);
    }
  } else {
    void repo.setUserLocale(uid, i18n.locale);
  }
}

function watchUserData(session: Session): Unsubscribe {
  const { store, user } = session;
  let migrating = false;
  return repo.subscribeUserData(user.uid, (data) => {
    session.loaded.user = true;
    applyProfileLocale(user.uid, data.locale);
    store.set({
      currentMeetingId: data.currentMeetingId,
      decisionsAutomaticBehavior: data.decisionsAutomaticBehavior,
      visitedIds: data.visitedIds,
      loading: isLoading(session),
    });
    refreshCurrent(store);
    session.syncShared();
    if (!migrating && Object.keys(data.legacy).length > 0) {
      migrating = true;
      void repo.migrateLegacyMeetings(user.uid, user.name, data.legacy).finally(() => {
        migrating = false;
      });
    }
  });
}

function watchSharedWith(session: Session): Unsubscribe {
  const { store, user } = session;
  if (!user.email) {
    store.set({ sharedLoading: false });
    return () => {};
  }
  return repo.subscribeSharedWith(user.email, (entries) => {
    store.set({ sharedEntries: entries, sharedLoading: false });
    session.syncShared();
  });
}

/** Request counts on your events; once per session, clears requests past
 * their 30 days (Privacy Policy). */
function watchRequestCounts({ set }: StoreAccess, uid: string): Unsubscribe {
  let swept = false;
  return repo.subscribeRequestsByOwner(uid, (counts) => {
    set({ requestCounts: counts });
    if (!swept) {
      swept = true;
      void repo.expireRequests(uid, Object.keys(counts)).catch(() => {});
    }
  });
}

/** Everything a signed-in session listens to; returns the function that stops it all. */
export function watchSession(
  store: StoreAccess,
  user: Viewer,
  isMine: (id: string) => boolean,
): Unsubscribe {
  const shared = createSharedEventsSync(store, user, isMine);
  const session: Session = {
    store,
    user,
    loaded: { own: false, user: false },
    syncShared: shared.sync,
  };
  const offs = [
    watchOwnMeetings(session),
    watchUserData(session),
    watchSharedWith(session),
    watchRequestCounts(store, user.uid),
  ];
  return () => {
    offs.forEach((off) => off());
    shared.stop();
  };
}
