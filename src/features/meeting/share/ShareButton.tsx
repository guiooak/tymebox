import { useState } from 'react';
import { Button } from '../../../common/components';
import { useT } from '../../../common/services/i18n';
import { useMeetingStore } from '../store';
import { eventLink, ShareModal } from './ShareModal';
import styles from './share.module.css';

/**
 * Header control for sharing. The owner gets "Share" (with a badge while
 * access requests wait); everyone else sees who shared it and their role, and
 * can copy the link.
 */
export function ShareButton() {
  const event = useMeetingStore((state) => state.event);
  const role = useMeetingStore((state) => state.role);
  const requests = useMeetingStore((state) => state.requests);
  const tt = useT();
  const t = tt.share;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!event || !role) {
    return null;
  }

  if (role !== 'owner') {
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(eventLink(event.id));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
      }
    };
    return (
      <div className={styles.sharedChip}>
        <span>{t.sharedBy(event.ownerName || t.theOwner, tt.roles[role])}</span>
        <Button size="sm" theme="secondary" outline onClick={() => void copy()}>
          {copied ? t.copied : t.copyLink}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        size="sm"
        theme="secondary"
        outline
        className={styles.shareButton}
        onClick={() => setOpen(true)}
        aria-label={requests.length > 0 ? t.shareWaiting(requests.length) : t.share}
      >
        {t.share}
        {requests.length > 0 && <span className={styles.badge}>{requests.length}</span>}
      </Button>
      <ShareModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
