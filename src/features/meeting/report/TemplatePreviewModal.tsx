import { useState } from 'react';
import { Button, Modal } from '../../../common/components';
import { copyRich } from '../../../common/services/clipboard';
import { useT } from '../../../common/services/i18n';
import { eventReportPath } from '../../../common/services/router';
import type { Meeting } from '../domain/types';
import { reportEmailFragment, reportEmailHtml, reportText } from './reportEmail';
import styles from './MeetingReport.module.css';

export type TemplatePreviewModalProps = {
  open: boolean;
  onClose: () => void;
  meeting: Meeting;
  chartImageSrc: string | null;
  /** On-budget streak shown on the report (0 when it isn't). */
  streak: number;
};

/**
 * "Copy report": previews the report as it will look in an e-mail and copies
 * it as rich HTML (inline styles, chart image, tinted timing cards) plus a
 * plain-text version for places that only take text.
 */
export function TemplatePreviewModal({
  open,
  onClose,
  meeting,
  chartImageSrc,
  streak,
}: TemplatePreviewModalProps) {
  const tt = useT();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!open) {
    return null;
  }

  const options = {
    chartImage: chartImageSrc,
    streak,
    reportUrl: `${window.location.origin}${eventReportPath(meeting.id)}`,
  };

  const onCopy = async () => {
    setFailed(false);
    try {
      await copyRich({
        html: reportEmailHtml(meeting, options),
        text: reportText(meeting, options.reportUrl),
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tt.report.preview}
      width={720}
      closeOnOverlayClick
      footer={
        <>
          {failed && <span className={styles.copyError}>{tt.report.copyFailed}</span>}
          <Button theme="secondary" outline onClick={onClose}>
            {tt.common.close}
          </Button>
          <Button onClick={() => void onCopy()}>
            {copied ? tt.report.copied : tt.report.copy}
          </Button>
        </>
      }
    >
      <div
        className={styles.preview}
        // Our own markup: every value from the event is escaped in reportEmail.ts.
        dangerouslySetInnerHTML={{ __html: reportEmailFragment(meeting, options) }}
      />
    </Modal>
  );
}
