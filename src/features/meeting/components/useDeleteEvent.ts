import { useDialog } from '../../../common/components';
import type { Meeting } from '../domain/types';
import { useMeetingStore } from '../store';

/** "Delete event" from a list: asks first, then deletes it for everyone. */
export function useDeleteEvent(): (meeting: Meeting) => Promise<void> {
  const dialog = useDialog();
  const deleteEvent = useMeetingStore((state) => state.deleteEvent);

  return async (meeting) => {
    const confirmed = await dialog.confirm({
      title: 'Delete this event?',
      text: `“${meeting.name || 'Untitled event'}” and its report will be deleted, also for everyone it’s shared with. This can’t be undone.`,
      confirmButtonText: 'Delete event',
      confirmButtonTheme: 'danger',
      cancelButtonText: 'Keep it',
    });
    if (confirmed) {
      await deleteEvent(meeting.id);
    }
  };
}
