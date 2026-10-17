import { Badge, BlankSlate, Box, Button, Heading } from '../../../common/components';
import { formatLong } from '../../../common/services/datetime';
import {
  eventPath,
  eventReportPath,
  useNavigation,
} from '../../../common/services/router';
import { ROLE_LABELS } from '../domain/access';
import { useMeetingStore, type SharedEventSummary } from '../store';
import styles from './Home.module.css';

const STATUS: Record<
  SharedEventSummary['status'],
  { label: string; theme: 'success' | 'secondary' | 'info' | 'danger' }
> = {
  active: { label: 'Live', theme: 'success' },
  draft: { label: 'Setting up', theme: 'secondary' },
  finished: { label: 'Finished', theme: 'info' },
  cancelled: { label: 'Cancelled', theme: 'danger' },
};

/**
 * Events other people shared with you, or public ones you opened through a
 * link. Kept apart from your own events and left out of your metrics.
 */
export function SharedWithMe() {
  const navigation = useNavigation();
  const events = useMeetingStore((state) => state.sharedEvents);
  const loading = useMeetingStore((state) => state.sharedLoading);

  if (loading) {
    return null;
  }

  return (
    <section className={styles.recentSection} aria-labelledby="shared-with-me">
      <div className={styles.sectionHead}>
        <Heading size="sm" level={2}>
          <span id="shared-with-me">Shared with me</span>
        </Heading>
      </div>
      {events.length === 0 ? (
        <BlankSlate
          art="events"
          compact
          title="Nothing shared with you yet"
          description="Events people share with your email, and public ones you open, show up here."
        />
      ) : (
        <div className={styles.list}>
          {events.map((event) => {
            const status = STATUS[event.status];
            const finished = event.status === 'finished';
            return (
              <Box key={event.id} className={styles.item}>
                <div>
                  <strong>{event.name || 'Untitled event'}</strong>
                  <div className={styles.meta}>
                    by {event.ownerName || 'someone'}
                    {finished && event.realEndTime
                      ? ` · ${formatLong(event.realEndTime)}`
                      : ''}
                  </div>
                </div>
                <div className={styles.actions}>
                  <Badge theme={status.theme}>{status.label}</Badge>
                  <Badge>
                    {event.via === 'public' ? 'Public link' : ROLE_LABELS[event.via]}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() =>
                      navigation.go(
                        finished ? eventReportPath(event.id) : eventPath(event.id),
                      )
                    }
                  >
                    {finished ? 'View report' : 'Open'}
                  </Button>
                </div>
              </Box>
            );
          })}
        </div>
      )}
    </section>
  );
}
