import { roleFor, type Role } from '../domain/access';
import * as repo from '../domain/meetingRepository';
import { CLOSED_EVENT } from './context';
import type { StoreAccess, Unsubscribe, Viewer } from './types';

/** One open event: who opened it and the subscriptions it holds. */
type OpenWatch = {
  store: StoreAccess;
  user: Viewer;
  id: string;
  disposed: boolean;
  offEvent: Unsubscribe | null;
  ownerSubs: Unsubscribe[];
  visitRecorded: boolean;
};

function subscribeEvent(watch: OpenWatch) {
  const { set } = watch.store;
  watch.offEvent = repo.subscribeMeeting(
    watch.id,
    (meeting) => {
      if (!watch.disposed) {
        set(
          meeting
            ? { event: meeting, eventView: 'ready' }
            : { event: null, eventView: 'denied' },
        );
      }
    },
    () => {
      // Not allowed (or no longer): wait for access to change.
      watch.offEvent = null;
      if (!watch.disposed) {
        set({ event: null, eventView: 'denied' });
      }
    },
  );
}

/** Members and requests are listened to only while you own the event. */
function syncOwnerSubscriptions(watch: OpenWatch, role: Role | null) {
  const { set } = watch.store;
  if (role === 'owner' && watch.ownerSubs.length === 0) {
    watch.ownerSubs = [
      repo.subscribeMembers(watch.id, (members) => set({ members })),
      repo.subscribeRequests(watch.id, (requests) => set({ requests })),
    ];
  } else if (role !== 'owner' && watch.ownerSubs.length > 0) {
    watch.ownerSubs.forEach((off) => off());
    watch.ownerSubs = [];
    set({ members: [], requests: [] });
  }
}

/** A public event you came to by link is remembered under "Shared with me". */
function recordPublicVisit(watch: OpenWatch, role: Role | null) {
  const { access, myMember } = watch.store.get();
  if (
    !watch.visitRecorded &&
    role &&
    role !== 'owner' &&
    !myMember &&
    access?.visibility === 'public'
  ) {
    watch.visitRecorded = true;
    void repo.recordVisit(watch.user.uid, watch.id);
  }
}

/** Work out your role again after access settings or your membership change. */
function recompute(watch: OpenWatch) {
  if (watch.disposed) {
    return;
  }
  const { set, get } = watch.store;
  const { access, myMember } = get();
  const role = roleFor(access, watch.user, myMember);
  set({ role });
  syncOwnerSubscriptions(watch, role);
  // Access granted (an approved request, a new share, made public) after a
  // refusal: load the event now.
  if (role && !watch.offEvent) {
    subscribeEvent(watch);
  }
  recordPublicVisit(watch, role);
}

function subscribeAccess(watch: OpenWatch): Unsubscribe {
  return repo.subscribeAccessSettings(watch.id, (access) => {
    watch.store.set({ access });
    recompute(watch);
  });
}

function subscribeMembership(watch: OpenWatch): Unsubscribe {
  const { email } = watch.user;
  return email
    ? repo.subscribeMyMembership(watch.id, email, (myMember) => {
        watch.store.set({ myMember });
        recompute(watch);
      })
    : () => {};
}

function subscribeMyRequest(watch: OpenWatch): Unsubscribe {
  const { email } = watch.user;
  return email
    ? repo.subscribeMyRequest(watch.id, email, (myRequest) =>
        watch.store.set({ myRequest }),
      )
    : () => {};
}

/** Everything an open event listens to; returns the function that closes it. */
export function watchOpenEvent(
  store: StoreAccess,
  user: Viewer,
  id: string,
): Unsubscribe {
  const watch: OpenWatch = {
    store,
    user,
    id,
    disposed: false,
    offEvent: null,
    ownerSubs: [],
    visitRecorded: false,
  };
  subscribeEvent(watch);
  const offs = [
    subscribeAccess(watch),
    subscribeMembership(watch),
    subscribeMyRequest(watch),
  ];

  return () => {
    watch.disposed = true;
    watch.offEvent?.();
    offs.forEach((off) => off());
    watch.ownerSubs.forEach((off) => off());
    if (store.get().openId === id) {
      store.set(CLOSED_EVENT);
    }
  };
}
