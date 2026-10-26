import { Box, Button } from '../../../common/components';
import {
  eventPath,
  eventReportPath,
  useNavigation,
} from '../../../common/services/router';
import { useT } from '../../../common/services/i18n';
import { useMeetingStore } from '../store';
import styles from './Home.module.css';

/**
 * "2 people are asking for access": pending requests across your events, each
 * linking to the event, where Share lists them for approval.
 */
export function AccessRequestsNotice() {
  const navigation = useNavigation();
  const counts = useMeetingStore((state) => state.requestCounts);
  const t = useT();
  const meetings = useMeetingStore((state) => state.meetings);

  // Requests on your own events only, and only the events with any waiting.
  const pending = Object.entries(counts).flatMap(([id, count]) => {
    const meeting = meetings.find((item) => item.id === id);
    return meeting && count > 0 ? [{ meeting, count }] : [];
  });
  const total = pending.reduce((sum, entry) => sum + entry.count, 0);

  if (total === 0) {
    return null;
  }

  return (
    <Box className={styles.requests}>
      <strong>{t.home.requests.asking(total)}</strong>
      <div className={styles.requestList}>
        {pending.map(({ meeting, count }) => (
          <Button
            key={meeting.id}
            size="sm"
            theme="secondary"
            outline
            onClick={() =>
              navigation.go(
                meeting.realEndTime ? eventReportPath(meeting.id) : eventPath(meeting.id),
              )
            }
          >
            {meeting.name || t.common.untitledEvent} ({count})
          </Button>
        ))}
      </div>
      <span className={styles.meta}>{t.home.requests.hint}</span>
    </Box>
  );
}
