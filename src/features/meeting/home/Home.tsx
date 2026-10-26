import {
  Badge,
  BlankSlate,
  Box,
  Button,
  Container,
  Heading,
  Loader,
  Page,
} from '../../../common/components';
import { formatLong, hoursOf, now } from '../../../common/services/datetime';
import {
  paths,
  useNavigation,
  eventPath,
  eventReportPath,
} from '../../../common/services/router';
import { useAuthStore } from '../../auth';
import { EventRow, useEventActions } from '../components';
import { useT, type Messages } from '../../../common/services/i18n';
import type { Meeting } from '../domain/types';
import { useMeetingStore } from '../store';
import { OnboardingCard } from './OnboardingCard';
import { MetricsGrid } from './MetricsGrid';
import { TemplateShortcuts, useCreateFromTemplate } from './TemplateShortcuts';
import { useMeetingMetrics } from './useMeetingMetrics';
import { AccessRequestsNotice } from './AccessRequestsNotice';
import { SharedWithMe } from './SharedWithMe';
import styles from './Home.module.css';

function greeting(t: Messages['home']): string {
  const hour = hoursOf(now());
  if (hour < 12) {
    return t.morning;
  }
  return hour < 18 ? t.afternoon : t.evening;
}

/** A scheduled event under "Starting soon". */
function UpcomingEvent({ meeting }: { meeting: Meeting }) {
  const tt = useT();
  const actions = useEventActions(meeting);
  return (
    <EventRow
      name={meeting.name}
      meta={formatLong(meeting.expectedStartTime)}
      onOpen={() => void actions.openBoard()}
      aside={<Badge theme="info">{tt.status.scheduled}</Badge>}
      menu={[
        { label: tt.home.openBoard, onSelect: () => void actions.openBoard() },
        {
          label: tt.home.deleteEvent,
          danger: true,
          onSelect: () => void actions.remove(),
        },
      ]}
    />
  );
}

/** A finished event under "Recent events". */
function RecentEvent({ meeting }: { meeting: Meeting }) {
  const t = useT().home;
  const actions = useEventActions(meeting);
  return (
    <EventRow
      name={meeting.name}
      meta={t.recentMeta(formatLong(meeting.realEndTime), meeting.goals.length)}
      onOpen={() => void actions.openReport()}
      menu={[
        { label: t.viewReport, onSelect: () => void actions.openReport() },
        { label: t.clone, onSelect: () => void actions.clone() },
        { label: t.deleteEvent, danger: true, onSelect: () => void actions.remove() },
      ]}
    />
  );
}

export function Home() {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const current = useMeetingStore((state) => state.currentMeeting);
  const loading = useMeetingStore((state) => state.loading);
  const onTemplate = useCreateFromTemplate();
  const metrics = useMeetingMetrics();
  const tt = useT();
  const t = tt.home;

  const firstName = user?.displayName?.split(' ')[0];

  // Surface whatever the user can pick up where they left off.
  const resume = !current
    ? null
    : current.realEndTime
      ? {
          label: t.resume.reportLabel,
          to: eventReportPath(current.id),
          hint: t.resume.reportHint,
        }
      : current.realStartTime
        ? {
            label: t.resume.liveLabel,
            to: eventPath(current.id),
            hint: t.resume.liveHint,
          }
        : {
            label: t.resume.draftLabel,
            to: eventPath(current.id),
            hint: t.resume.draftHint,
          };

  return (
    <Container className={styles.home}>
      <Page>
        <header className={styles.head}>
          <div>
            <Heading size="md" level={1}>
              {t.greeting(greeting(t), firstName)}
            </Heading>
          </div>
          <div className={styles.actions}>
            <Button onClick={() => navigation.go(paths.newMeeting)}>{t.newEvent}</Button>
          </div>
        </header>

        {loading ? (
          <Loader className={styles.loading} label={t.loadingEvents} />
        ) : (
          <>
            {metrics.total === 0 && (
              <OnboardingCard
                onTrySample={() => void onTemplate(t.sample.name, t.sample.goals)}
              />
            )}

            <AccessRequestsNotice />

            {resume && (
              <Box className={styles.resume}>
                <div>
                  <strong>{current?.name || tt.common.untitledEvent}</strong>
                  <div className={styles.meta}>{resume.hint}</div>
                </div>
                <Button theme="tertiary" onClick={() => navigation.go(resume.to)}>
                  {resume.label}
                </Button>
              </Box>
            )}

            <TemplateShortcuts lastFinished={metrics.recent[0]} />

            {metrics.upcoming.length > 0 && (
              <section className={styles.recentSection}>
                <Heading size="sm" level={2}>
                  {t.startingSoon}
                </Heading>
                <div className={styles.list}>
                  {metrics.upcoming.map((meeting) => (
                    <UpcomingEvent key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              </section>
            )}

            {metrics.total === 0 ? (
              <Box className={styles.emptyEvents}>
                <BlankSlate
                  art="events"
                  title={t.noEvents}
                  description={t.noEventsText}
                  action={
                    <Button
                      theme="secondary"
                      outline
                      onClick={() => navigation.go(paths.newMeeting)}
                    >
                      {t.planEvent}
                    </Button>
                  }
                />
              </Box>
            ) : (
              <>
                <MetricsGrid metrics={metrics} />

                <section className={styles.recentSection}>
                  <div className={styles.sectionHead}>
                    <Heading size="sm" level={2}>
                      {t.recentEvents}
                    </Heading>
                    <Button
                      size="sm"
                      theme="tertiary"
                      onClick={() => navigation.go(paths.meetings)}
                    >
                      {t.viewAll}
                    </Button>
                  </div>
                  {metrics.recent.length === 0 ? (
                    <p className={styles.meta}>{t.finishToSee}</p>
                  ) : (
                    <div className={styles.list}>
                      {metrics.recent.map((meeting) => (
                        <RecentEvent key={meeting.id} meeting={meeting} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            <SharedWithMe />
          </>
        )}
      </Page>
    </Container>
  );
}
