import {
  Badge,
  BlankSlate,
  Box,
  Button,
  Container,
  Heading,
  Page,
} from '../../../common/components';
import {
  formatDuration,
  formatLong,
  hoursOf,
  now,
} from '../../../common/services/datetime';
import { paths, useNavigation } from '../../../common/services/router';
import { useAuthStore } from '../../auth';
import { useMeetingStore } from '../store';
import { OnboardingCard } from './OnboardingCard';
import { meetingTemplates } from './templates';
import { useMeetingMetrics } from './useMeetingMetrics';
import styles from './Home.module.css';

function budgetLabel(ratio: number | null): { value: string; note: string } {
  if (ratio == null) {
    return { value: '—', note: 'No finished events yet' };
  }
  const pct = Math.round((ratio - 1) * 100);
  if (pct === 0) {
    return { value: 'On budget', note: 'Right on the clock' };
  }
  return pct > 0
    ? { value: `${pct}% over`, note: 'Ran longer than planned' }
    : { value: `${Math.abs(pct)}% under`, note: 'Beat the clock' };
}

function greeting(): string {
  const hour = hoursOf(now());
  if (hour < 12) {
    return 'Good morning';
  }
  return hour < 18 ? 'Good afternoon' : 'Good evening';
}

export function Home() {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const current = useMeetingStore((state) => state.currentMeeting);
  const reopen = useMeetingStore((state) => state.reopen);
  const clone = useMeetingStore((state) => state.clone);
  const createFromTemplate = useMeetingStore((state) => state.createFromTemplate);
  const metrics = useMeetingMetrics();

  const firstName = user?.displayName?.split(' ')[0];

  const onReopen = async (id: string) => {
    await reopen(id);
    navigation.go(paths.report);
  };

  const onClone = async (id: string) => {
    const newId = await clone(id);
    if (newId) {
      navigation.go(paths.liveMeeting);
    }
  };

  const onTemplate = async (name: string, goals: string[]) => {
    const newId = await createFromTemplate(name, goals);
    if (newId) {
      navigation.go(paths.liveMeeting);
    }
  };

  // Surface whatever the user can pick up where they left off.
  const resume = current?.realEndTime
    ? {
        label: 'View last report',
        to: paths.report,
        hint: 'Your most recent event is wrapped up.',
      }
    : current?.realStartTime
      ? {
          label: 'Resume live event',
          to: paths.liveMeeting,
          hint: 'You have an event in progress.',
        }
      : current
        ? {
            label: 'Continue planning',
            to: paths.liveMeeting,
            hint: 'You have a draft in the works.',
          }
        : null;

  const budget = budgetLabel(metrics.budgetRatio);
  const lastFinished = metrics.recent[0];

  return (
    <Container className={styles.home}>
      <Page>
        <header className={styles.head}>
          <div>
            <Heading size="md" level={1}>
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </Heading>
            {metrics.thisWeek > 0 && (
              <p className={styles.meta}>
                {metrics.thisWeek} event{metrics.thisWeek === 1 ? '' : 's'} finished this
                week
                {metrics.onBudgetStreak > 1
                  ? ` · ${metrics.onBudgetStreak} in a row on budget 🔥`
                  : ''}
              </p>
            )}
          </div>
          <div className={styles.actions}>
            <Button
              theme="secondary"
              outline
              onClick={() => navigation.go(paths.meetings)}
            >
              View all history
            </Button>
            <Button onClick={() => navigation.go(paths.newMeeting)}>+ New event</Button>
          </div>
        </header>

        {metrics.total === 0 && (
          <OnboardingCard
            onTrySample={() =>
              void onTemplate('Sample event', [
                'Look around the board',
                'Add a milestone of your own',
                'Finish and read the report',
              ])
            }
          />
        )}

        {resume && (
          <Box className={styles.resume}>
            <div>
              <strong>{current?.name || 'Untitled event'}</strong>
              <div className={styles.meta}>{resume.hint}</div>
            </div>
            <Button theme="success" onClick={() => navigation.go(resume.to)}>
              {resume.label}
            </Button>
          </Box>
        )}

        <section className={styles.templatesSection}>
          <Heading size="sm" level={2}>
            Start something
          </Heading>
          <div className={styles.templates}>
            {lastFinished && (
              <button
                type="button"
                className={styles.template}
                onClick={() => void onClone(lastFinished.id)}
              >
                <strong>Repeat “{lastFinished.name}”</strong>
                <span className={styles.meta}>
                  {lastFinished.goals.length} milestones · your last event
                </span>
              </button>
            )}
            {meetingTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={styles.template}
                onClick={() => void onTemplate(template.name, template.goals)}
              >
                <strong>{template.label}</strong>
                <span className={styles.meta}>{template.hint}</span>
              </button>
            ))}
          </div>
        </section>

        {metrics.upcoming.length > 0 && (
          <section className={styles.recentSection}>
            <Heading size="sm" level={2}>
              Starting soon
            </Heading>
            <div className={styles.list}>
              {metrics.upcoming.map((meeting) => (
                <Box key={meeting.id} className={styles.item}>
                  <div>
                    <strong>{meeting.name}</strong>
                    <div className={styles.meta}>
                      {formatLong(meeting.expectedStartTime)}
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <Badge theme="info">Scheduled</Badge>
                    <Button
                      size="sm"
                      onClick={() => {
                        void reopen(meeting.id).then(() =>
                          navigation.go(paths.liveMeeting),
                        );
                      }}
                    >
                      Open board
                    </Button>
                  </div>
                </Box>
              ))}
            </div>
          </section>
        )}

        {metrics.total === 0 ? (
          <Box>
            <BlankSlate
              art="events"
              title="No events yet"
              description="Plan your first one and it’ll come to life here."
              action={
                <Button onClick={() => navigation.go(paths.newMeeting)}>
                  Plan an event
                </Button>
              }
            />
          </Box>
        ) : (
          <>
            <div className={styles.metrics}>
              <Box className={styles.metric}>
                <span className={styles.metricValue}>{budget.value}</span>
                <span className={styles.metricLabel}>Time vs budget</span>
                <span className={styles.metricNote}>{budget.note}</span>
              </Box>
              <Box className={styles.metric}>
                <span className={styles.metricValue}>
                  {metrics.goalCompletion == null
                    ? '—'
                    : `${Math.round(metrics.goalCompletion * 100)}%`}
                </span>
                <span className={styles.metricLabel}>Goals completed</span>
                <span className={styles.metricNote}>Weighted across finished events</span>
              </Box>
              <Box className={styles.metric}>
                <span className={styles.metricValue}>{metrics.thisMonth}</span>
                <span className={styles.metricLabel}>This month</span>
                <span className={styles.metricNote}>
                  {metrics.finished} finished all-time
                </span>
              </Box>
              <Box className={styles.metric}>
                <span className={styles.metricValue}>
                  {metrics.onBudgetStreak > 0 ? `${metrics.onBudgetStreak} 🔥` : '—'}
                </span>
                <span className={styles.metricLabel}>On-budget streak</span>
                <span className={styles.metricNote}>
                  {metrics.totalSpentMs > 0
                    ? `${formatDuration(metrics.totalSpentMs)} spent in total`
                    : 'Finish an event on time to start one'}
                </span>
              </Box>
            </div>

            <section className={styles.recentSection}>
              <div className={styles.sectionHead}>
                <Heading size="sm" level={2}>
                  Recent events
                </Heading>
                <Button
                  size="sm"
                  theme="secondary"
                  outline
                  onClick={() => navigation.go(paths.meetings)}
                >
                  View all
                </Button>
              </div>
              {metrics.recent.length === 0 ? (
                <p className={styles.meta}>Finish an event to see it here.</p>
              ) : (
                <div className={styles.list}>
                  {metrics.recent.map((meeting) => (
                    <Box key={meeting.id} className={styles.item}>
                      <div>
                        <strong>{meeting.name}</strong>
                        <div className={styles.meta}>
                          {formatLong(meeting.realEndTime)} · {meeting.goals.length} goals
                        </div>
                      </div>
                      <div className={styles.actions}>
                        <Button
                          theme="secondary"
                          outline
                          size="sm"
                          onClick={() => void onReopen(meeting.id)}
                        >
                          View report
                        </Button>
                        <Button size="sm" onClick={() => void onClone(meeting.id)}>
                          Clone
                        </Button>
                      </div>
                    </Box>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </Page>
    </Container>
  );
}
