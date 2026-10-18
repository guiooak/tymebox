import { useMemo, useRef, useState } from 'react';
import {
  Article,
  Badge,
  Box,
  Button,
  Container,
  Footer,
  Heading,
  Page,
  useDialog,
} from '../../../common/components';
import { findChartSvg, svgElementToPngDataUrl } from '../../../common/services/chart';
import { readCssVar, readCssVarsInTheme } from '../../../common/services/theme';
import { formatLong, formatTime, isSameDay } from '../../../common/services/datetime';
import { printPage } from '../../../common/services/download';
import {
  eventPath,
  Navigate,
  paths,
  useNavigation,
} from '../../../common/services/router';
import { useT } from '../../../common/services/i18n';
import { BurndownChart } from '../components';
import { can, type Role } from '../domain/access';
import type { Meeting } from '../domain/types';
import { EventGate, ShareButton } from '../share';
import { useMeetingStore } from '../store';
import { useReportTrend } from './useReportTrend';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { TimeCardsGrid } from './TimeCardsGrid';
import styles from './MeetingReport.module.css';

/** The report of the finished event in the URL, for anyone allowed to open it. */
export function MeetingReport() {
  return <EventGate>{(event, role) => <Report meeting={event} role={role} />}</EventGate>;
}

function Report({ meeting, role }: { meeting: Meeting; role: Role }) {
  const navigation = useNavigation();
  const dialog = useDialog();
  const tt = useT();
  const t = tt.report;
  const backToDashboard = useMeetingStore((state) => state.backToDashboard);

  const chartRef = useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [chartImage, setChartImage] = useState<string | null>(null);
  // The streak compares against your own events, so it only means something
  // on a report of yours.
  const ownTrend = useReportTrend(meeting);
  const trend = role === 'owner' ? ownTrend : 0;

  const sideTopics = useMemo(
    () => meeting.sideTopics.filter((topic) => topic.value.trim()),
    [meeting],
  );

  // Until it's finished, the event's place is its live board.
  if (!meeting.realEndTime) {
    return <Navigate to={eventPath(meeting.id)} replace />;
  }

  const sameDay = isSameDay(meeting.realStartTime, meeting.realEndTime);
  const burndownItems = meeting.goals.map((goal) => ({
    id: goal.id,
    title: goal.name,
    weight: goal.weight,
    finishedAt: goal.finishedAt || null,
  }));

  // Mail is read on white: the copied report always carries the light chart,
  // even from dark mode (its strokes are swapped for their light tokens).
  const renderLightChartImage = async (): Promise<string | null> => {
    const svg = findChartSvg(chartRef.current);
    if (!svg) {
      return null;
    }
    const tokens = {
      tendency: '--tw-chart-tendency',
      progress: '--tw-chart-progress',
      projection: '--tw-chart-projection',
      grid: '--tw-chart-grid',
      axis: '--tw-chart-axis',
      bg: '--tw-chart-bg',
    };
    const current = Object.fromEntries(
      Object.entries(tokens).map(([key, prop]) => [key, readCssVar(prop)]),
    ) as Record<keyof typeof tokens, string>;
    const light = readCssVarsInTheme(tokens, 'light');
    return await svgElementToPngDataUrl(svg, {
      background: light.bg || '#ffffff',
      recolor: (Object.keys(tokens) as Array<keyof typeof tokens>).map((key) => [
        current[key],
        light[key],
      ]),
    });
  };

  const onCopyReport = async () => {
    setChartImage(await renderLightChartImage());
    setPreviewOpen(true);
  };

  const onBackToDashboard = async () => {
    await backToDashboard();
    navigation.go(eventPath(meeting.id));
  };

  const onStartNew = async () => {
    const confirmed = await dialog.confirm({
      text: t.closeReport,
      confirmButtonText: tt.common.yesDoIt,
      cancelButtonText: tt.common.notAnymore,
    });
    if (confirmed) {
      // The new-event form lets go of a finished current event by itself.
      navigation.go(paths.newMeeting);
    }
  };

  return (
    <Container className={styles.report}>
      <Page>
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <Heading size="lg" level={1} title={meeting.name} />
            <ShareButton />
          </div>
          {sameDay ? (
            <Heading size="xxs" level={2}>
              {t.happenedOn(
                formatLong(meeting.realStartTime),
                formatTime(meeting.realEndTime),
              )}
            </Heading>
          ) : (
            <>
              <Heading size="xxs" level={2}>
                {t.started(formatLong(meeting.realStartTime))}
              </Heading>
              <Heading size="xxs" level={2}>
                {t.finished(formatLong(meeting.realEndTime))}
              </Heading>
            </>
          )}
          {meeting.description && (
            <Article className={styles.description} text={meeting.description} />
          )}
          {trend >= 2 && (
            <div className={styles.trend}>
              <Badge theme="success">{t.streak(trend)}</Badge>
            </div>
          )}
        </header>

        <section className={styles.section}>
          <Heading size="sm" level={2} className={styles.sectionTitle}>
            {t.goals}
          </Heading>
          <div className={styles.goals}>
            {meeting.goals.map((goal) => (
              <Box key={goal.id} className={styles.goal}>
                <div className={styles.goalHead}>
                  <strong>{goal.name}</strong>
                  <span className={styles.goalMeta}>
                    {goal.finishedAt ? t.doneAt(formatTime(goal.finishedAt)) : t.notDone}{' '}
                    · {t.weight(goal.weight)}
                  </span>
                </div>
                {goal.decisions && <p className={styles.decisions}>{goal.decisions}</p>}
              </Box>
            ))}
          </div>
        </section>

        {sideTopics.length > 0 && (
          <section className={styles.section}>
            <Heading size="sm" level={2} className={styles.sectionTitle}>
              {t.sideTopics}
            </Heading>
            <ul className={styles.topics}>
              {sideTopics.map((topic) => (
                <li key={topic.id}>
                  {topic.value}
                  {topic.goalName && (
                    <span className={styles.sideTopicTag}>
                      {' '}
                      {t.during(topic.goalName)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.section}>
          <Heading size="sm" level={2} className={styles.sectionTitle}>
            {t.performance}
          </Heading>
          <BurndownChart
            ref={chartRef}
            startTime={meeting.expectedStartTime}
            endTime={meeting.expectedEndTime}
            items={burndownItems}
          />
        </section>

        <section className={styles.section}>
          <TimeCardsGrid
            expectedStartTime={meeting.expectedStartTime}
            expectedEndTime={meeting.expectedEndTime}
            realStartTime={meeting.realStartTime}
            realEndTime={meeting.realEndTime}
          />
        </section>

        <Footer justifyContent="space-between">
          {can(role, 'run') ? (
            <Button theme="tertiary" onClick={() => void onBackToDashboard()}>
              {t.reopen}
            </Button>
          ) : (
            <Button theme="secondary" outline onClick={() => navigation.go(paths.home)}>
              {t.goHome}
            </Button>
          )}
          <div className={styles.actions}>
            <Button theme="info" outline onClick={printPage}>
              {t.print}
            </Button>
            <Button theme="info" outline onClick={() => void onCopyReport()}>
              {t.copyReport}
            </Button>
            <Button onClick={() => void onStartNew()}>{t.startNew}</Button>
          </div>
        </Footer>
      </Page>

      <TemplatePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        meeting={meeting}
        chartImageSrc={chartImage}
        streak={trend}
      />
    </Container>
  );
}
