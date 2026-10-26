import * as repo from '../domain/meetingRepository';
import type { Slice } from './context';

/** Who can see the open event: visibility, members and access requests. */
export const sharingSlice: Slice<
  | 'setVisibility'
  | 'shareWith'
  | 'setMemberRole'
  | 'unshare'
  | 'approveRequest'
  | 'denyRequest'
  | 'requestAccess'
  | 'cancelAccessRequest'
> = ({ get }, { requireUser, ownerEvent }) => ({
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
      user.uid,
      { email: user.email, name: user.name, photoURL: user.photoURL },
      message,
    );
  },

  cancelAccessRequest: async () => {
    const user = requireUser();
    const { openId, access } = get();
    if (openId && access) {
      await repo.cancelAccessRequest(openId, access.owner, user.uid, user.email);
    }
  },
});
