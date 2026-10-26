/*
 * Where things live:
 *   meetings/$id                         the event (readable per its access)
 *   meetingAccess/$id                    owner, visibility, publicRole, members
 *   sharedWith/$emailKey/$id             "Shared with me" index
 *   accessRequests/$id/$emailKey         pending requests for an event
 *   requestsByOwner/$uid/$id/$emailKey   an owner's pending requests, for Home
 *   users/$uid                           currentMeetingId, settings, visited
 * See database.rules.json for who may read and write each one.
 */

export const eventPath = (id: string) => `meetings/${id}`;
export const accessPath = (id: string) => `meetingAccess/${id}`;
export const userPath = (uid: string) => `users/${uid}`;

export type Unsubscribe = () => void;
