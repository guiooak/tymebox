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
  /** For the CC field: everyone else with access. Null when you can't see them (not the owner). */
  participantEmails?: string[] | null;
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
  participantEmails = null,
}: TemplatePreviewModalProps) {
  const tt = useT();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copiedEmails, setCopiedEmails] = useState(0);

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

  // Only reachable with someone to copy: the button is disabled otherwise.
  const onCopyEmails = async (emails: string[]) => {
    setFailed(false);
    try {
      await navigator.clipboard.writeText(emails.join(', '));
      setCopiedEmails(emails.length);
      setTimeout(() => setCopiedEmails(0), 2000);
    } catch {
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
          {participantEmails && (
            <Button
              theme="secondary"
              outline
              className={failed ? undefined : styles.footerStart}
              disabled={participantEmails.length === 0}
              title={
                participantEmails.length === 0
                  ? tt.report.noParticipants
                  : tt.report.participantsHint
              }
              onClick={() => void onCopyEmails(participantEmails)}
            >
              {copiedEmails > 0
                ? tt.report.copiedParticipants(copiedEmails)
                : tt.report.copyParticipants}
            </Button>
          )}
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
