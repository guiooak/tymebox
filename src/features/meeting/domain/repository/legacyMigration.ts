import { writeMany } from '../../../../common/services/database';
import { fromLegacy, type RawMeeting } from '../meetingShape';
import { accessPath, eventPath, userPath } from './paths';

/**
 * Move this user's pre-sharing events to meetings/$id, keeping their ids, as
 * private events they own. One atomic write per event: if it already exists
 * there the write is refused and the old copy stays for a later attempt.
 */
export async function migrateLegacyMeetings(
  uid: string,
  ownerName: string,
  legacy: Record<string, RawMeeting>,
): Promise<void> {
  for (const [id, raw] of Object.entries(legacy)) {
    try {
      await writeMany({
        [eventPath(id)]: fromLegacy(raw, id, uid, ownerName),
        [accessPath(id)]: { owner: uid, visibility: 'private', publicRole: 'viewer' },
        [`${userPath(uid)}/meetings/${id}`]: null,
      });
    } catch (error) {
      console.warn(`Could not move event ${id} to shared storage`, error);
    }
  }
}
