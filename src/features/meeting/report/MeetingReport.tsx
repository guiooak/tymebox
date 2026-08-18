import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Article,
  Badge,
  Box,
  Button,
  Container,
  Footer,
  Heading,
  Loader,
  Page,
  useDialog,
} from '../../../common/components';
import { svgElementToPngDataUrl } from '../../../common/services/chart';
import { readCssVar } from '../../../common/services/theme';
import { formatLong, formatTime, isSameDay } from '../../../common/services/datetime';
import { downloadUrl, printPage, toFileStem } from '../../../common/services/download';
import { paths, useNavigation } from '../../../common/services/router';
import { BurndownChart } from '../components';
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

export function MeetingReport() {
  const navigation = useNavigation();
  const dialog = useDialog();
  const loading = useMeetingStore((state) => state.loading);
  const meeting = useMeetingStore((state) => state.currentMeeting);
  const backToDashboard = useMeetingStore((state) => state.backToDashboard);
  const discardCurrent = useMeetingStore((state) => state.discardCurrent);

  const chartRef = useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [chartImage, setChartImage] = useState<string | null>(null);
  const guarded = useRef(false);
  const trend = useReportTrend(meeting);

  useEffect(() => {
    if (loading || guarded.current) {
      return;
    }
    guarded.current = true;
    void (async () => {
      if (!meeting?.name) {
        await dialog.alert('There is no event to report yet.');
        navigation.replace(paths.newMeeting);
      } else if (!meeting.realEndTime) {
        await dialog.alert('Finish your event to see its report.');
        navigation.replace(paths.liveMeeting);
      }
    })();
  }, [loading, meeting, dialog, navigation]);

  const sideTopics = useMemo(
    () => (meeting?.sideTopics ?? []).filter((topic) => topic.value.trim()),
    [meeting],
  );

  if (loading || !meeting?.realEndTime) {
    return (
      <div className={styles.loading}>
        <Loader />
      </div>
    );
  }

  const sameDay = isSameDay(meeting.realStartTime, meeting.realEndTime);
  const burndownItems = meeting.goals.map((goal) => ({
    id: goal.id,
    title: goal.name,
    weight: goal.weight,
    finishedAt: goal.finishedAt || null,
  }));

  const renderChartImage = async (): Promise<string | null> => {
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) {
      return null;
    }
    // The chart draws itself in theme colours, so the flattened PNG has to be
    // filled with the same surface — a white plate would swallow dark-mode
    // strokes and labels.
    return await svgElementToPngDataUrl(svg as SVGSVGElement, {
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
    navigation.go(paths.liveMeeting);
  };

  const onStartNew = async () => {
    const confirmed = await dialog.confirm({
      text: 'This will close this report. Start a new event?',
      confirmButtonText: 'Yes, do it',
      cancelButtonText: 'Not anymore',
    });
    if (confirmed) {
      await discardCurrent();
      navigation.go(paths.newMeeting);
    }
  };

  return (
    <Container className={styles.report}>
      <Page>
        <header>
          <Heading size="lg" level={1} title={meeting.name} />
          {sameDay ? (
            <Heading size="xxs" level={2}>
              ⏱ Happened on {formatLong(meeting.realStartTime)} until{' '}
              {formatTime(meeting.realEndTime)}
            </Heading>
          ) : (
            <>
              <Heading size="xxs" level={2}>
                ⏱ Started {formatLong(meeting.realStartTime)}
              </Heading>
              <Heading size="xxs" level={2}>
                ⏱ Finished {formatLong(meeting.realEndTime)}
              </Heading>
            </>
          )}
          {meeting.description && <Article text={meeting.description} />}
          {trend >= 2 && (
            <div className={styles.trend}>
              <Badge theme="success">
                🔥 {ordinal(trend)} event in a row finishing on budget
              </Badge>
            </div>
          )}
        </header>

        <section className={styles.section}>
          <Heading size="sm" level={2}>
            Goals
          </Heading>
          <div className={styles.goals}>
            {meeting.goals.map((goal) => (
              <Box key={goal.id} className={styles.goal}>
                <div className={styles.goalHead}>
                  <strong>{goal.name}</strong>
                  <span className={styles.goalMeta}>
                    {goal.finishedAt
                      ? `done at ${formatTime(goal.finishedAt)}`
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
            <Heading size="sm" level={2}>
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
          <Heading size="sm" level={2}>
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
          <Button theme="secondary" outline onClick={() => void onBackToDashboard()}>
            Back to dashboard
          </Button>
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
