import {
  Badge,
  BlankSlate,
  Box,
  Button,
  Container,
  Heading,
  Icon,
  Loader,
  ItemLink,
  itemLinkAbove,
  itemLinkContainer,
  Menu,
  Page,
  type IconName,
} from '../../../common/components';
import {
  formatDuration,
  formatLong,
  hoursOf,
  now,
} from '../../../common/services/datetime';
import {
  paths,
  useNavigation,
  eventPath,
  eventReportPath,
} from '../../../common/services/router';
import { useAuthStore } from '../../auth';
import { useDeleteEvent } from '../components';
import { useT, type Messages } from '../../../common/services/i18n';
import { useMeetingStore } from '../store';
import { OnboardingCard } from './OnboardingCard';
import { MEETING_TEMPLATES, type MeetingTemplateId } from './templates';
import { useMeetingMetrics } from './useMeetingMetrics';
import { AccessRequestsNotice } from './AccessRequestsNotice';
import { SharedWithMe } from './SharedWithMe';
import styles from './Home.module.css';

const TEMPLATE_ICONS: Record<MeetingTemplateId, IconName> = {
  weeklyPlanning: 'calendar',
  retro: 'cycle',
  oneOnOne: 'users',
};

function budgetLabel(
  ratio: number | null,
  t: Messages['home']['budget'],
): { value: string; note: string } {
  if (ratio == null) {
    return { value: t.none, note: t.noneNote };
  }
  const pct = Math.round((ratio - 1) * 100);
  if (pct === 0) {
    return { value: t.onBudget, note: t.onBudgetNote };
  }
  return pct > 0
    ? { value: t.over(pct), note: t.overNote }
    : { value: t.under(Math.abs(pct)), note: t.underNote };
}

function greeting(t: Messages['home']): string {
  const hour = hoursOf(now());
  if (hour < 12) {
    return t.morning;
  }
  return hour < 18 ? t.afternoon : t.evening;
}

export function Home() {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const current = useMeetingStore((state) => state.currentMeeting);
  const loading = useMeetingStore((state) => state.loading);
  const reopen = useMeetingStore((state) => state.reopen);
  const clone = useMeetingStore((state) => state.clone);
  const createFromTemplate = useMeetingStore((state) => state.createFromTemplate);
  const onDelete = useDeleteEvent();
  const metrics = useMeetingMetrics();
  const tt = useT();
  const t = tt.home;

  const firstName = user?.displayName?.split(' ')[0];

  const onReopen = async (id: string) => {
    await reopen(id);
    navigation.go(eventReportPath(id));
  };

  const onOpenBoard = async (id: string) => {
    await reopen(id);
    navigation.go(eventPath(id));
  };

  const onClone = async (id: string) => {
    const newId = await clone(id);
    if (newId) {
      navigation.go(eventPath(newId));
    }
  };

  const onTemplate = async (name: string, goals: string[]) => {
    const newId = await createFromTemplate(name, goals);
    if (newId) {
      navigation.go(eventPath(newId));
    }
  };

  // Surface whatever the user can pick up where they left off.
  const resume = !current
    ? null
    : current.realEndTime
      ? {
          label: t.resume.reportLabel,
          to: eventReportPath(current.id),
          hint: t.resume.reportHint,
        }
      : current?.realStartTime
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

  const budget = budgetLabel(metrics.budgetRatio, t.budget);
  const lastFinished = metrics.recent[0];

  return (
    <Container className={styles.home}>
      <Page>
        <header className={styles.head}>
          <div>
            <Heading size="md" level={1}>
              {t.greeting(greeting(t), firstName)}
            </Heading>
            {metrics.thisWeek > 0 && (
              <p className={styles.meta}>
                {t.thisWeek(metrics.thisWeek)}
                {metrics.onBudgetStreak > 1 ? t.streakInline(metrics.onBudgetStreak) : ''}
              </p>
            )}
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

            <section className={styles.templatesSection}>
              <Heading size="sm" level={2}>
                {t.startSomething}
              </Heading>
              <div className={styles.templates}>
                {lastFinished && (
                  <button
                    type="button"
                    className={styles.template}
                    title={t.repeatHint(lastFinished.goals.length)}
                    onClick={() => void onClone(lastFinished.id)}
                  >
                    <span className={styles.templateIcon}>
                      <Icon name="repeat" size={16} />
                    </span>
                    <strong className={styles.templateName}>
                      {t.repeat(lastFinished.name)}
                    </strong>
                    <span className={styles.templateMeta}>
                      {t.milestoneCount(lastFinished.goals.length)}
                    </span>
                    <Icon name="arrowRight" size={16} className={styles.templateArrow} />
                  </button>
                )}
                {MEETING_TEMPLATES.map((id) => {
                  const template = t.templates[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      className={styles.template}
                      onClick={() => void onTemplate(template.label, template.goals)}
                    >
                      <span className={styles.templateIcon}>
                        <Icon name={TEMPLATE_ICONS[id]} size={16} />
                      </span>
                      <strong className={styles.templateName}>{template.label}</strong>
                      <span className={styles.templateMeta}>{template.hint}</span>
                      <Icon
                        name="arrowRight"
                        size={16}
                        className={styles.templateArrow}
                      />
                    </button>
                  );
                })}
              </div>
            </section>

            {metrics.upcoming.length > 0 && (
              <section className={styles.recentSection}>
                <Heading size="sm" level={2}>
                  {t.startingSoon}
                </Heading>
                <div className={styles.list}>
                  {metrics.upcoming.map((meeting) => (
                    <Box
                      key={meeting.id}
                      className={`${styles.item} ${itemLinkContainer}`}
                    >
                      <div>
                        <ItemLink onClick={() => void onOpenBoard(meeting.id)}>
                          <strong>{meeting.name}</strong>
                        </ItemLink>
                        <div className={styles.meta}>
                          {formatLong(meeting.expectedStartTime)}
                        </div>
                      </div>
                      <div className={`${styles.actions} ${itemLinkAbove}`}>
                        <Badge theme="info">{tt.status.scheduled}</Badge>
                        <Menu
                          label={tt.common.actionsFor(meeting.name)}
                          items={[
                            {
                              label: t.openBoard,
                              onSelect: () => void onOpenBoard(meeting.id),
                            },
                            {
                              label: t.deleteEvent,
                              danger: true,
                              onSelect: () => void onDelete(meeting),
                            },
                          ]}
                        />
                      </div>
                    </Box>
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
                <div className={styles.metrics}>
                  <Box className={styles.metric}>
                    <span className={styles.metricValue}>{budget.value}</span>
                    <span className={styles.metricLabel}>{t.timeVsBudget}</span>
                    <span className={styles.metricNote}>{budget.note}</span>
                  </Box>
                  <Box className={styles.metric}>
                    <span className={styles.metricValue}>
                      {metrics.goalCompletion == null
                        ? '—'
                        : `${Math.round(metrics.goalCompletion * 100)}%`}
                    </span>
                    <span className={styles.metricLabel}>{t.goalsCompleted}</span>
                    <span className={styles.metricNote}>{t.goalsCompletedNote}</span>
                  </Box>
                  <Box className={styles.metric}>
                    <span className={styles.metricValue}>{metrics.thisMonth}</span>
                    <span className={styles.metricLabel}>{t.thisMonth}</span>
                    <span className={styles.metricNote}>
                      {t.finishedAllTime(metrics.finished)}
                    </span>
                  </Box>
                  <Box className={styles.metric}>
                    <span className={styles.metricValue}>
                      {metrics.onBudgetStreak > 0 ? `${metrics.onBudgetStreak} 🔥` : '—'}
                    </span>
                    <span className={styles.metricLabel}>{t.streak}</span>
                    <span className={styles.metricNote}>
                      {metrics.totalSpentMs > 0
                        ? t.spentTotal(formatDuration(metrics.totalSpentMs))
                        : t.streakEmpty}
                    </span>
                  </Box>
                </div>

                <section className={styles.recentSection}>
                  <div className={styles.sectionHead}>
                    <Heading size="sm" level={2}>
                      {t.recentEvents}
                    </Heading>
                    <Button
                      size="sm"
                      theme="secondary"
                      outline
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
                        <Box
                          key={meeting.id}
                          className={`${styles.item} ${itemLinkContainer}`}
                        >
                          <div>
                            <ItemLink onClick={() => void onReopen(meeting.id)}>
                              <strong>{meeting.name}</strong>
                            </ItemLink>
                            <div className={styles.meta}>
                              {t.recentMeta(
                                formatLong(meeting.realEndTime),
                                meeting.goals.length,
                              )}
                            </div>
                          </div>
                          <div className={`${styles.actions} ${itemLinkAbove}`}>
                            <Menu
                              label={tt.common.actionsFor(meeting.name)}
                              items={[
                                {
                                  label: t.viewReport,
                                  onSelect: () => void onReopen(meeting.id),
                                },
                                {
                                  label: t.clone,
                                  onSelect: () => void onClone(meeting.id),
                                },
                                {
                                  label: t.deleteEvent,
                                  danger: true,
                                  onSelect: () => void onDelete(meeting),
                                },
                              ]}
                            />
                          </div>
                        </Box>
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
