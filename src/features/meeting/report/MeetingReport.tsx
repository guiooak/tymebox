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
import { readCssVar } from '../../../common/services/theme';
import { formatLong, formatTime, isSameDay } from '../../../common/services/datetime';
import { downloadUrl, printPage, toFileStem } from '../../../common/services/download';
import {
  eventPath,
  Navigate,
  paths,
  useNavigation,
} from '../../../common/services/router';
import { BurndownChart } from '../components';
import { can, type Role } from '../domain/access';
import type { Meeting } from '../domain/types';
import { EventGate, ShareButton } from '../share';
import { useMeetingStore } from '../store';
import { useReportTrend } from './useReportTrend';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { TimeCardsGrid } from './TimeCardsGrid';
import styles from './MeetingReport.module.css';

/** "3rd event in a row under budget" — ordinal for a small, human-sized count. */
function ordinal(value: number): string {
  const suffix =
    value % 100 >= 11 && value % 100 <= 13
      ? 'th'
      : (['th', 'st', 'nd', 'rd'][value % 10] ?? 'th');
  return `${value}${suffix}`;
}

/** The report of the finished event in the URL, for anyone allowed to open it. */
export function MeetingReport() {
  return <EventGate>{(event, role) => <Report meeting={event} role={role} />}</EventGate>;
}

function Report({ meeting, role }: { meeting: Meeting; role: Role }) {
  const navigation = useNavigation();
  const dialog = useDialog();
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

  const renderChartImage = async (): Promise<string | null> => {
    const svg = findChartSvg(chartRef.current);
    if (!svg) {
      return null;
    }
    // The chart draws itself in theme colours, so the flattened PNG has to be
    // filled with the same surface — a white plate would swallow dark-mode
    // strokes and labels.
    return await svgElementToPngDataUrl(svg, {
      background: readCssVar('--tw-chart-bg', '#ffffff'),
    });
  };

  const onCopyReport = async () => {
    setChartImage(await renderChartImage());
    setPreviewOpen(true);
  };

  const onDownloadChart = async () => {
    const dataUrl = await renderChartImage();
    if (!dataUrl) {
      await dialog.alert('The chart is not ready to export yet.');
      return;
    }
    downloadUrl(dataUrl, `${toFileStem(meeting.name)}-burndown.png`);
  };

  const onBackToDashboard = async () => {
    await backToDashboard();
    navigation.go(eventPath(meeting.id));
  };

  const onStartNew = async () => {
    const confirmed = await dialog.confirm({
      text: 'This will close this report. Start a new event?',
      confirmButtonText: 'Yes, do it',
      cancelButtonText: 'Not anymore',
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
              Happened on {formatLong(meeting.realStartTime)} until{' '}
              {formatTime(meeting.realEndTime)}
            </Heading>
          ) : (
            <>
              <Heading size="xxs" level={2}>
                Started {formatLong(meeting.realStartTime)}
              </Heading>
              <Heading size="xxs" level={2}>
                Finished {formatLong(meeting.realEndTime)}
              </Heading>
            </>
          )}
          {meeting.description && (
            <Article className={styles.description} text={meeting.description} />
          )}
          {trend >= 2 && (
            <div className={styles.trend}>
              <Badge theme="success">
                🔥 {ordinal(trend)} event in a row finishing on budget
              </Badge>
            </div>
          )}
        </header>

        <section className={styles.section}>
          <Heading size="sm" level={2} className={styles.sectionTitle}>
            Goals
          </Heading>
          <div className={styles.goals}>
            {meeting.goals.map((goal) => (
              <Box key={goal.id} className={styles.goal}>
                <div className={styles.goalHead}>
                  <strong>{goal.name}</strong>
                  <span className={styles.goalMeta}>
                    {goal.finishedAt
                      ? `done at ${formatTime(goal.finishedAt)}h`
                      : 'not done'}{' '}
                    · weight {goal.weight}
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
              Side topics
            </Heading>
            <ul className={styles.topics}>
              {sideTopics.map((topic) => (
                <li key={topic.id}>
                  {topic.value}
                  {topic.goalName && (
                    <span className={styles.sideTopicTag}>
                      {' '}
                      — during “{topic.goalName}”
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.section}>
          <Heading size="sm" level={2} className={styles.sectionTitle}>
            Performance
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
              Back to dashboard
            </Button>
          ) : (
            <Button theme="secondary" outline onClick={() => navigation.go(paths.home)}>
              Go to Home
            </Button>
          )}
          <div className={styles.actions}>
            <Button theme="info" outline onClick={() => void onDownloadChart()}>
              Download chart
            </Button>
            <Button theme="info" outline onClick={printPage}>
              Print / PDF
            </Button>
            <Button theme="info" outline onClick={() => void onCopyReport()}>
              Copy report
            </Button>
            <Button onClick={() => void onStartNew()}>Start new event</Button>
          </div>
        </Footer>
      </Page>

      <TemplatePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        meeting={meeting}
        chartImageSrc={chartImage}
      />
    </Container>
  );
}
