import { useDialog } from '../../../common/components';
import { useT } from '../../../common/services/i18n';
import type { Meeting } from '../domain/types';
import { useMeetingStore } from '../store';

/** "Delete event" from a list: asks first, then deletes it for everyone. */
export function useDeleteEvent(): (meeting: Meeting) => Promise<void> {
  const dialog = useDialog();
  const t = useT();
  const deleteEvent = useMeetingStore((state) => state.deleteEvent);

  return async (meeting) => {
    const confirmed = await dialog.confirm({
      title: t.events.deleteTitle,
      text: t.events.deleteText(meeting.name || t.common.untitledEvent),
      confirmButtonText: t.events.deleteConfirm,
      confirmButtonTheme: 'danger',
      cancelButtonText: t.events.keepIt,
    });
    if (confirmed) {
      await deleteEvent(meeting.id);
    }
  };
}
