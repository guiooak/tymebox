import { Badge, BlankSlate, Heading } from '../../../common/components';
import { formatLong } from '../../../common/services/datetime';
import {
  eventPath,
  eventReportPath,
  useNavigation,
} from '../../../common/services/router';
import { useT } from '../../../common/services/i18n';
import { EventRow } from '../components';
import { useMeetingStore, type SharedEventSummary } from '../store';
import styles from './Home.module.css';

const STATUS_THEME: Record<
  SharedEventSummary['status'],
  'success' | 'secondary' | 'info' | 'danger'
> = {
  active: 'success',
  draft: 'secondary',
  finished: 'info',
  cancelled: 'danger',
};

/**
 * Events other people shared with you, or public ones you opened through a
 * link. Kept apart from your own events and left out of your metrics.
 */
export function SharedWithMe() {
  const navigation = useNavigation();
  const events = useMeetingStore((state) => state.sharedEvents);
  const loading = useMeetingStore((state) => state.sharedLoading);
  const t = useT();

  if (loading) {
    return null;
  }

  return (
    <section className={styles.recentSection} aria-labelledby="shared-with-me">
      <div className={styles.sectionHead}>
        <Heading size="sm" level={2}>
          <span id="shared-with-me">{t.home.shared.title}</span>
        </Heading>
      </div>
      {events.length === 0 ? (
        <BlankSlate
          art="events"
          compact
          title={t.home.shared.emptyTitle}
          description={t.home.shared.emptyText}
        />
      ) : (
        <div className={styles.list}>
          {events.map((event) => {
            const finished = event.status === 'finished';
            const open = () =>
              navigation.go(finished ? eventReportPath(event.id) : eventPath(event.id));
            return (
              <EventRow
                key={event.id}
                name={event.name}
                meta={
                  <>
                    {t.home.shared.by(event.ownerName || t.home.shared.someone)}
                    {finished && event.realEndTime
                      ? ` · ${formatLong(event.realEndTime)}`
                      : ''}
                  </>
                }
                onOpen={open}
                aside={
                  <>
                    <Badge theme={STATUS_THEME[event.status]}>
                      {t.status[event.status]}
                    </Badge>
                    <Badge>
                      {event.via === 'public'
                        ? t.home.shared.publicLink
                        : t.roles[event.via]}
                    </Badge>
                  </>
                }
                menu={[
                  {
                    label: finished ? t.home.viewReport : t.home.openBoard,
                    onSelect: open,
                  },
                ]}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
