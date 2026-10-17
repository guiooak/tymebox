import { useState } from 'react';
import { Button, Modal } from '../../../common/components';
import { formatLong, formatTime } from '../../../common/services/datetime';
import { getT, useT } from '../../../common/services/i18n';
import type { Meeting } from '../domain/types';
import styles from './MeetingReport.module.css';

export type TemplatePreviewModalProps = {
  open: boolean;
  onClose: () => void;
  meeting: Meeting;
  chartImageSrc: string | null;
};

function buildReportText(meeting: Meeting): string {
  const t = getT().report.text;
  const lines: string[] = [meeting.name, ''];
  if (meeting.description) {
    lines.push(meeting.description, '');
  }
  lines.push(t.goals);
  for (const goal of meeting.goals) {
    const done = goal.finishedAt ? t.doneAt(formatTime(goal.finishedAt)) : t.notDone;
    lines.push(t.goal(goal.name, goal.weight, done));
    if (goal.decisions) {
      lines.push(`    ${goal.decisions}`);
    }
  }
  const topics = meeting.sideTopics.filter((topic) => topic.value.trim());
  if (topics.length) {
    lines.push('', t.sideTopics);
    topics.forEach((topic) =>
      lines.push(
        topic.goalName ? t.topicDuring(topic.value, topic.goalName) : `• ${topic.value}`,
      ),
    );
  }
  lines.push('', t.happened(formatLong(meeting.realStartTime)));
  return lines.join('\n');
}

export function TemplatePreviewModal({
  open,
  onClose,
  meeting,
  chartImageSrc,
}: TemplatePreviewModalProps) {
  const tt = useT();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildReportText(meeting));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tt.report.preview}
      width={640}
      closeOnOverlayClick
      footer={
        <>
          <Button theme="secondary" outline onClick={onClose}>
            {tt.common.close}
          </Button>
          <Button onClick={() => void onCopy()}>
            {copied ? tt.report.copied : tt.report.copy}
          </Button>
        </>
      }
    >
      <div className={styles.preview}>
        <h4>{meeting.name}</h4>
        {chartImageSrc && (
          <img
            className={styles.previewChart}
            src={chartImageSrc}
            alt={tt.report.chartAlt}
          />
        )}
        <pre className={styles.previewText}>{buildReportText(meeting)}</pre>
      </div>
    </Modal>
  );
}
