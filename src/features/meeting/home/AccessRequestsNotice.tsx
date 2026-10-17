import { Box, Button } from '../../../common/components';
import {
  eventPath,
  eventReportPath,
  useNavigation,
} from '../../../common/services/router';
import { useMeetingStore } from '../store';
import styles from './Home.module.css';

/**
 * "2 people are asking for access": pending requests across your events, each
 * linking to the event, where Share lists them for approval.
 */
export function AccessRequestsNotice() {
  const navigation = useNavigation();
  const counts = useMeetingStore((state) => state.requestCounts);
  const meetings = useMeetingStore((state) => state.meetings);

  const pending = Object.entries(counts)
    .map(([id, count]) => ({ meeting: meetings.find((item) => item.id === id), count }))
    .filter((entry) => entry.meeting && entry.count > 0);
  const total = pending.reduce((sum, entry) => sum + entry.count, 0);

  if (total === 0) {
    return null;
  }

  return (
    <Box className={styles.requests}>
      <strong>
        {total === 1 ? '1 person is' : `${total} people are`} asking for access
      </strong>
      <div className={styles.requestList}>
        {pending.map(({ meeting, count }) =>
          meeting ? (
            <Button
              key={meeting.id}
              size="sm"
              theme="secondary"
              outline
              onClick={() =>
                navigation.go(
                  meeting.realEndTime
                    ? eventReportPath(meeting.id)
                    : eventPath(meeting.id),
                )
              }
            >
              {meeting.name || 'Untitled event'} ({count})
            </Button>
          ) : null,
        )}
      </div>
      <span className={styles.meta}>
        Open the event and use Share to approve or deny.
      </span>
    </Box>
  );
}
